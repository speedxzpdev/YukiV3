import logging

import aiohttp

from app.parsers.video_parser import is_tiktok_short_url

logger = logging.getLogger("tiktok_url")

SHORT_URL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
}


async def resolve_tiktok_url(url_or_id: str) -> str:
    video_input = str(url_or_id or "").strip()
    if not is_tiktok_short_url(video_input):
        return video_input

    timeout = aiohttp.ClientTimeout(total=12, sock_connect=5, sock_read=7)
    try:
        async with aiohttp.ClientSession(headers=SHORT_URL_HEADERS, timeout=timeout) as session:
            async with session.get(video_input, allow_redirects=True, max_redirects=6) as response:
                resolved = str(response.url)
                if resolved and resolved != video_input:
                    logger.info("Resolved short TikTok URL: %s -> %s", video_input, resolved)
                    return resolved
    except Exception as exc:
        logger.warning("Could not resolve TikTok short URL %s: %s", video_input, exc)

    return video_input
