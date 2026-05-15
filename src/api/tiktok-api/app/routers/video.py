import logging
import shutil

import aiohttp
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from starlette.background import BackgroundTask

from app.formatters.text_panel import build_text_panel
from app.parsers.video_parser import extract_video_id, is_tiktok_short_url, parse_raw_info
from app.services.ytdlp import download_format, get_raw_info
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


def _is_likely_downloadable_quality(item: dict) -> bool:
    source = str(item.get("source") or "")
    url = str(item.get("url") or "")
    return source.startswith("tikwm:") or "webapp-prime" not in url.lower()


def _is_watermarked_quality(item: dict) -> bool:
    variant = str(item.get("variant") or "")
    format_id = str(item.get("format_id") or "")
    format_note = str(item.get("format_note") or "")
    source = str(item.get("source") or "")
    return (
        bool(item.get("watermarked"))
        or variant == "wmplay_addr"
        or format_id == "download"
        or "watermark" in format_note.lower()
        or source == "tikwm:wmplay"
    )


def _quality_rank(item: dict) -> tuple[int, int, int]:
    resolution = item.get("resolution") or {}
    width = int(resolution.get("width") or 0)
    height = int(resolution.get("height") or 0)
    bitrate = int(item.get("bitrate") or 0)
    file_size = int(item.get("file_size") or 0)
    return (width * height, bitrate, file_size)


def _dedupe_qualities(qualities: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for item in qualities:
        key = item.get("url") or item.get("format_id") or item.get("label")
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _select_download_candidates(data: dict, quality: str) -> list[dict]:
    qualities = [item for item in data.get("qualities", []) if item.get("url")]
    if not qualities:
        return []

    lowered = quality.lower()
    if lowered in ("highest", "original", "best"):
        candidates = [item for item in qualities if not _is_watermarked_quality(item)]
        return _dedupe_qualities(sorted(candidates, key=_quality_rank, reverse=True))

    if lowered in ("medium", "normal"):
        preferred = []
        for item in qualities:
            source = str(item.get("source") or "")
            variant = str(item.get("variant") or "")
            if source == "tikwm:play" and variant == "play_addr":
                preferred.append(item)
        candidates = [item for item in qualities if not _is_watermarked_quality(item)]
        preferred.extend(sorted(candidates, key=_quality_rank, reverse=True))
        return _dedupe_qualities(preferred)

    matches = []
    for item in qualities:
        if quality in {
            str(item.get("format_id") or ""),
            str(item.get("variant") or ""),
            str(item.get("label") or ""),
        }:
            matches.append(item)

    return _dedupe_qualities(matches)


def _resolve_input(url: str | None, video_id: str | None) -> str:
    video_input = str(url or video_id or "").strip()
    if not video_input:
        raise HTTPException(status_code=400, detail="Missing 'url' or 'id'")
    if is_tiktok_short_url(video_input):
        return video_input
    try:
        extract_video_id(video_input)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return video_input


def _resolved_video_id(raw: dict, fallback_input: str) -> str:
    raw_id = str(raw.get("id") or "").strip()
    if raw_id:
        return raw_id

    try:
        return extract_video_id(raw.get("webpage_url") or fallback_input)
    except ValueError:
        return "tiktok"


async def _stream_remote_url(file_url: str, media_type: str, filename: str, headers: dict) -> StreamingResponse:
    probe_headers = headers.copy()
    probe_headers["Range"] = "bytes=0-1023"
    async with aiohttp.ClientSession() as session:
        async with session.get(
            file_url,
            headers=probe_headers,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as probe_resp:
            logger.info("CDN probe status: %s", probe_resp.status)
            if probe_resp.status == 404:
                raise HTTPException(status_code=404, detail="Video no longer available on CDN")
            if probe_resp.status not in (200, 206):
                error_body = await probe_resp.text()
                logger.error("CDN probe failed: %s - %s", probe_resp.status, error_body[:200])
                raise HTTPException(status_code=502, detail=f"CDN returned status {probe_resp.status}")

    async def stream_file():
        async with aiohttp.ClientSession() as session:
            async with session.get(
                file_url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=None, sock_connect=20, sock_read=120),
            ) as resp:
                if resp.status not in (200, 206):
                    error_body = await resp.text()
                    logger.error("CDN GET failed: %s - %s", resp.status, error_body[:200])
                    return

                async for chunk in resp.content.iter_chunked(1024 * 1024):
                    yield chunk

    return StreamingResponse(
        stream_file(),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Accept-Ranges": "bytes",
        },
    )


def _resolved_tiktok_url(raw: dict, fallback_input: str) -> str:
    return raw.get("webpage_url") or raw.get("original_url") or fallback_input


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
        tikwm = await get_tikwm_info(_resolved_tiktok_url(raw, video_input))
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

    try:
        raw = await get_raw_info(video_input)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Upstream extraction timed out") from exc
    except Exception as exc:
        logger.exception("Extraction error")
        raise HTTPException(status_code=502, detail=f"Extraction failed: {exc}") from exc

    tikwm = await get_tikwm_info(_resolved_tiktok_url(raw, video_input))
    data = await parse_raw_info(raw, tikwm=tikwm)
    vid = _resolved_video_id(raw, video_input)

    media_type = "video/mp4"
    filename = f"{vid}_video.mp4"
    if quality.lower() == "audio":
        file_url = (data.get("sound") or {}).get("url")
        media_type = "audio/mpeg"
        filename = f"{vid}_audio.mp3"
        if not file_url:
            raise HTTPException(status_code=404, detail="No URL for selected media")

        headers = TIKTOK_HEADERS.copy()
        headers["Referer"] = raw.get("webpage_url", "https://www.tiktok.com/")
        try:
            return await _stream_remote_url(file_url, media_type, filename, headers)
        except aiohttp.ClientError as exc:
            logger.error("Download error: %s", exc)
            raise HTTPException(status_code=502, detail=f"Failed to fetch from CDN: {exc}") from exc

    candidates = _select_download_candidates(data, quality)
    if not candidates:
        available = [item.get("format_id") or item.get("variant") for item in data.get("qualities", [])]
        raise HTTPException(status_code=404, detail=f"No format for {quality}. Available: {available}")

    headers = TIKTOK_HEADERS.copy()
    headers["Referer"] = raw.get("webpage_url", "https://www.tiktok.com/")
    errors = []

    for selected in candidates:
        selected_source = str(selected.get("source") or "")
        selected_format = selected.get("format_id")
        selected_variant = selected.get("variant") or selected_format or "video"

        if selected_source == "yt-dlp" and selected_format:
            try:
                result = await download_format(video_input, selected_format)
                ext = result.get("ext") or "mp4"
                filename = f"{vid}_{selected_variant}.{ext}"
                return FileResponse(
                    result["path"],
                    media_type=media_type,
                    filename=filename,
                    background=BackgroundTask(shutil.rmtree, result["temp_dir"], ignore_errors=True),
                )
            except Exception as exc:
                logger.warning("yt-dlp download failed for %s: %s", selected_format, exc)
                errors.append(f"{selected_variant}: yt-dlp failed")
                continue

        file_url = selected.get("url")
        if not file_url:
            continue
        try:
            filename = f"{vid}_{selected_variant}.mp4"
            return await _stream_remote_url(file_url, media_type, filename, headers)
        except HTTPException as exc:
            logger.warning("CDN download failed for %s: %s", selected_variant, exc.detail)
            errors.append(f"{selected_variant}: {exc.detail}")
        except aiohttp.ClientError as exc:
            logger.warning("CDN download error for %s: %s", selected_variant, exc)
            errors.append(f"{selected_variant}: CDN error")

    raise HTTPException(
        status_code=502,
        detail=f"No downloadable non-watermarked format worked. Tried: {errors}",
    )
