import asyncio
import json
import logging
from urllib.parse import quote

import aiohttp

from app.config import settings
from .cache import cache

logger = logging.getLogger("tikwm")

TIKWM_API_URL = "https://www.tikwm.com/api/?url={url}"


def _cache_key(video_id: str) -> str:
    return f"tikwm:{video_id}"


async def get_tikwm_info(video_id_or_url: str) -> dict | None:
    from app.parsers.video_parser import extract_video_id

    try:
        vid = extract_video_id(video_id_or_url)
    except ValueError:
        vid = str(video_id_or_url or "").strip()

    if not vid:
        return None

    key = _cache_key(vid)
    if key in cache:
        logger.debug("Cache hit for %s", vid)
        return cache[key]

    url = TIKWM_API_URL.format(url=quote(video_id_or_url, safe=""))
    timeout = aiohttp.ClientTimeout(total=settings.TIKWM_TIMEOUT)

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"}) as resp:
                if resp.status != 200:
                    logger.warning("TikWM returned HTTP %s for %s", resp.status, vid)
                    return None
                payload = await resp.text()
    except asyncio.TimeoutError:
        logger.warning("TikWM timeout for %s", vid)
        return None
    except Exception as exc:
        logger.warning("TikWM fetch failed for %s: %s", vid, exc)
        return None

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        logger.warning("TikWM returned invalid JSON for %s", vid)
        return None

    if data.get("code") != 0:
        logger.warning("TikWM error for %s: %s", vid, data.get("msg"))
        return None

    cache[key] = data
    return data
