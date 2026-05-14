import asyncio, logging
from yt_dlp import YoutubeDL
from app.config import settings
from .cache import cache

logger = logging.getLogger("ytdlp")

YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': False,
    'skip_download': True,
    'format': 'bestvideo+bestaudio/best',
    'merge_output_format': None,
    'noplaylist': True,
    'source_address': '0.0.0.0',
    'socket_timeout': 15,
}

def extract_info_sync(video_id_or_url: str) -> dict:
    with YoutubeDL(YDL_OPTS) as ydl:
        return ydl.extract_info(video_id_or_url, download=False)

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