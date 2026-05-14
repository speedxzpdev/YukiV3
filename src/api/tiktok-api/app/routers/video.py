import logging

import aiohttp
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, StreamingResponse

from app.formatters.text_panel import build_text_panel
from app.parsers.video_parser import extract_video_id, parse_raw_info
from app.services.video_utils import get_best_format
from app.services.ytdlp import get_raw_info
from app.services.tikwm import get_tikwm_info

router = APIRouter(prefix="/video", tags=["video"])
logger = logging.getLogger("routes.video")

TIKTOK_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "identity;q=1, *;q=0",
    "Range": "bytes=0-",
    "Referer": "https://www.tiktok.com/",
    "Origin": "https://www.tiktok.com",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "video",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
}


def _resolve_input(url: str | None, video_id: str | None) -> str:
    video_input = url or video_id
    if not video_input:
        raise HTTPException(status_code=400, detail="Missing 'url' or 'id'")
    try:
        extract_video_id(video_input)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return video_input


@router.get("/info")
async def video_info(
    url: str | None = Query(default=None, description="TikTok video URL"),
    id: str | None = Query(default=None, description="TikTok video ID"),
    format: str = Query(default="json", description="json or text"),
):
    video_input = _resolve_input(url, id)

    try:
        raw = await get_raw_info(video_input)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Upstream extraction timed out") from exc
    except Exception as exc:
        logger.exception("Extraction error")
        raise HTTPException(status_code=502, detail=f"Extraction failed: {exc}") from exc

    data = await parse_raw_info(raw)
    needs_fallback = (
        not data.get("region")
        or data.get("source") in (None, "", "unknown", "Soon")
        or not (data.get("sound") or {}).get("url")
        or (data.get("stats") or {}).get("downloads") is None
    )
    if needs_fallback:
        tikwm = await get_tikwm_info(video_input)
        if tikwm:
            data = await parse_raw_info(raw, tikwm=tikwm)
    if format == "text":
        return PlainTextResponse(build_text_panel(data))
    return data


@router.get("/download")
async def download_video(
    url: str | None = Query(default=None, description="TikTok video URL"),
    id: str | None = Query(default=None, description="TikTok video ID"),
    quality: str = Query(default="highest", description="highest, medium, audio or format_id"),
):
    video_input = _resolve_input(url, id)
    vid = extract_video_id(video_input)

    try:
        raw = await get_raw_info(video_input)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Upstream extraction timed out") from exc
    except Exception as exc:
        logger.exception("Extraction error")
        raise HTTPException(status_code=502, detail=f"Extraction failed: {exc}") from exc

    formats = raw.get("formats", [])
    selected = get_best_format(formats, quality)
    if not selected:
        available = [fmt.get("format_id") for fmt in formats]
        raise HTTPException(status_code=404, detail=f"No format for {quality}. Available: {available}")

    file_url = selected.get("url")
    if not file_url:
        raise HTTPException(status_code=404, detail="No URL for selected format")

    headers = TIKTOK_HEADERS.copy()
    headers["Referer"] = raw.get("webpage_url", "https://www.tiktok.com/")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(
                file_url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as head_resp:
                logger.info("CDN HEAD status: %s", head_resp.status)
                if head_resp.status == 404:
                    raise HTTPException(status_code=404, detail="Video no longer available on CDN")
                if head_resp.status not in (200, 206, 403):
                    raise HTTPException(status_code=502, detail=f"CDN returned status {head_resp.status}")

            filename = f"{vid}_video.mp4"
            if quality == "audio":
                filename = f"{vid}_audio.mp3"

            async def stream_file():
                async with session.get(
                    file_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    if resp.status not in (200, 206):
                        error_body = await resp.text()
                        logger.error("CDN GET failed: %s - %s", resp.status, error_body[:200])
                        raise HTTPException(status_code=502, detail=f"CDN GET failed: {resp.status}")

                    async for chunk in resp.content.iter_chunked(1024 * 1024):
                        yield chunk

            return StreamingResponse(
                stream_file(),
                media_type="video/mp4" if quality != "audio" else "audio/mpeg",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}",
                    "Accept-Ranges": "bytes",
                },
            )
    except aiohttp.ClientError as exc:
        logger.error("Download error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Failed to fetch from CDN: {exc}") from exc
