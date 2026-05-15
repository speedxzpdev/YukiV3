import asyncio
import glob
import logging
import os
import shutil
import tempfile
from yt_dlp import YoutubeDL
from app.config import settings
from .cache import cache

logger = logging.getLogger("ytdlp")

def _impersonate_target() -> str | None:
    target = os.getenv("YTDLP_IMPERSONATE", "chrome").strip()
    if not target or target.lower() in {"0", "false", "none", "off"}:
        return None
    try:
        import curl_cffi  # noqa: F401
    except ImportError:
        return None
    return target

YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'noprogress': True,
    'extract_flat': False,
    'skip_download': True,
    'format': 'bestvideo+bestaudio/best',
    'merge_output_format': None,
    'noplaylist': True,
    'source_address': '0.0.0.0',
    'socket_timeout': 15,
    'retries': 3,
    'fragment_retries': 3,
}
if _impersonate_target():
    YDL_OPTS['impersonate'] = _impersonate_target()

def extract_info_sync(video_id_or_url: str) -> dict:
    with YoutubeDL(YDL_OPTS) as ydl:
        return ydl.extract_info(video_id_or_url, download=False)

def download_format_sync(video_id_or_url: str, format_id: str | None) -> dict:
    temp_dir = tempfile.mkdtemp(prefix="tiktok-api-")
    output_template = os.path.join(temp_dir, "%(id)s-%(format_id)s.%(ext)s")
    opts = {
        **YDL_OPTS,
        'skip_download': False,
        'format': format_id or 'best',
        'outtmpl': output_template,
    }

    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(video_id_or_url, download=True)

        requested = info.get('requested_downloads') or []
        filepath = requested[0].get('filepath') if requested else None
        if not filepath or not os.path.exists(filepath):
            matches = glob.glob(os.path.join(temp_dir, "*"))
            filepath = matches[0] if matches else None

        if not filepath or not os.path.exists(filepath):
            raise FileNotFoundError("yt-dlp did not create a media file")

        return {
            "path": filepath,
            "temp_dir": temp_dir,
            "ext": info.get("ext") or os.path.splitext(filepath)[1].lstrip(".") or "mp4",
            "format_id": info.get("format_id") or format_id,
        }
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

async def get_raw_info(video_id_or_url: str) -> dict:
    from app.parsers.video_parser import extract_video_id
    vid = extract_video_id(video_id_or_url)
    if vid in cache:
        logger.debug(f"Cache hit for {vid}")
        return cache[vid]

    logger.info(f"Extracting {vid}")
    try:
        info = await asyncio.wait_for(
            asyncio.to_thread(extract_info_sync, video_id_or_url),
            timeout=settings.YTDLP_TIMEOUT
        )
        cache[vid] = info
        return info
    except asyncio.TimeoutError:
        logger.error(f"Timeout for {video_id_or_url}")
        raise TimeoutError("Video extraction timed out")
    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        raise

async def download_format(video_id_or_url: str, format_id: str | None) -> dict:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(download_format_sync, video_id_or_url, format_id),
            timeout=settings.YTDLP_DOWNLOAD_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.error("Download timeout for %s (%s)", video_id_or_url, format_id)
        raise TimeoutError("Video download timed out")
