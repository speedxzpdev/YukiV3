import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger("video_parser")

try:
    SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")
except ZoneInfoNotFoundError:
    SAO_PAULO_TZ = timezone(timedelta(hours=-3))


def extract_video_id(url_or_id: str) -> str:
    patterns = [
        r"/video/(\d+)",
        r"tiktok\.com/@[\w.-]+/video/(\d+)",
        r"vm\.tiktok\.com/(\w+)/?",
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    if url_or_id.isdigit():
        return url_or_id
    raise ValueError(f"Could not extract id from '{url_or_id}'")


def _unique(values):
    seen = set()
    result = []
    for value in values:
        if not value:
            continue
        normalized = str(value).strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def _timestamp_to_iso(ts):
    if not ts:
        return None
    utc_dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
    return utc_dt.astimezone(SAO_PAULO_TZ).isoformat()


def _extract_tags(raw: dict) -> list[str]:
    tags = []
    raw_tags = raw.get("tags")
    if isinstance(raw_tags, list):
        tags.extend(raw_tags)
    elif isinstance(raw_tags, str):
        tags.append(raw_tags)

    caption = raw.get("description") or raw.get("title") or ""
    tags.extend(re.findall(r"#([\w.-]+)", caption))
    return _unique(tags)


def _infer_categories(tags: list[str], caption: str) -> list[str]:
    text = " ".join([caption, " ".join(tags)]).lower()
    categories = []
    mapping = {
        "anime": ["anime", "manga", "jjk", "sukuna", "otaku"],
        "music": ["music", "song", "sound", "remix", "beat"],
        "editing": ["edit", "editing", "capcut", "aftereffects", "ae"],
        "gaming": ["game", "gaming", "gamer", "stream"],
        "dance": ["dance", "danca", "choreo", "choreography"],
        "sports": ["sport", "sports", "football", "soccer", "basket", "futebol"],
        "comedy": ["comedy", "meme", "funny", "humor", "skit"],
    }
    for category, keywords in mapping.items():
        if any(keyword in text for keyword in keywords):
            categories.append(category)
    return _unique(categories) or ["general"]


def _infer_content_tips(tags: list[str], caption: str) -> list[str]:
    text = " ".join([caption, " ".join(tags)]).lower()
    tips = []
    if "fps" in text or "frame rate" in text:
        tips.append("high frame rate edit")
    if any(keyword in text for keyword in ["anime", "manga", "jjk", "sukuna"]):
        tips.append("anime / manga content")
    if any(keyword in text for keyword in ["edit", "editing", "capcut", "aftereffects"]):
        tips.append("edited short-form content")
    return _unique(tips)


def _resolve_sound_url(raw: dict, tikwm_data: dict | None) -> str | None:
    sound_url = next(
        (
            fmt.get("url")
            for fmt in raw.get("formats") or []
            if fmt.get("vcodec") == "none" and fmt.get("url")
        ),
        None,
    )
    if sound_url:
        return sound_url
    if tikwm_data:
        return tikwm_data.get("music") or None
    return None


def _quality_access_icon(url: str | None, source_key: str | None = None) -> str:
    if source_key == "wmplay":
        return "📱"
    if source_key == "play":
        return "🌐"
    if source_key == "hdplay":
        return "🌐📱"
    if not url:
        return "🌐📱"
    lowered = url.lower()
    if "api16-normal" in lowered or "tiktokv.us" in lowered or "musically" in lowered:
        return "📱"
    if "webapp" in lowered or "webapp-prime" in lowered or "tiktokcdn-us.com" in lowered:
        return "🌐"
    return "🌐📱"


def _clean_quality_name(fmt: dict, source_key: str | None = None) -> str:
    if source_key == "play":
        return "play_addr"
    if source_key == "wmplay":
        return "wmplay_addr"
    if source_key == "hdplay":
        return "hdplay_addr"

    url = str(fmt.get("url") or "").lower()
    raw_name = fmt.get("format_id") or fmt.get("format_note") or fmt.get("format") or "unknown"
    raw_text = str(raw_name).lower()

    if raw_text.startswith("adapt_"):
        return raw_text
    if "webapp" in url or "tiktokcdn-us.com" in url:
        return "play_addr"
    if "aweme/v1/play" in url or "tiktokv.us" in url:
        return "download_addr"

    name = str(raw_name).split(" - ", 1)[0].strip()
    name = re.sub(r"[^A-Za-z0-9_]+", "_", name).strip("_").lower()
    name = re.sub(r"_+", "_", name)

    return name or "unknown"


def _pick_quality_label(fmt: dict, source_key: str | None = None) -> str:
    return f"{_quality_access_icon(fmt.get('url'), source_key)} {_clean_quality_name(fmt, source_key)}"


def _format_size(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def _format_vq_score(value):
    if value is None:
        return None
    try:
        value = int(value)
    except (TypeError, ValueError):
        return value
    return value if value >= 0 else None


async def _quality_item_from_format(fmt: dict, source_key: str | None = None) -> dict | None:
    url = fmt.get("url")
    if not url:
        return None

    # FPS probing used to make /check and /download slow on the host.
    # Keep it only when yt-dlp already provides the value.
    fps = fmt.get("fps")

    resolution = {
        "width": fmt.get("width"),
        "height": fmt.get("height"),
    }
    return {
        "label": _pick_quality_label(fmt, source_key),
        "variant": _clean_quality_name(fmt, source_key),
        "access": _quality_access_icon(url, source_key),
        "format_id": fmt.get("format_id"),
        "url": url,
        "resolution": resolution,
        "original_resolution": fmt.get("resolution"),
        "bitrate": fmt.get("tbr"),
        "codec": fmt.get("vcodec") or fmt.get("acodec"),
        "file_size": _format_size(fmt.get("filesize") or fmt.get("filesize_approx")),
        "vq_score": _format_vq_score(fmt.get("quality")),
        "fps": fps,
        "ext": fmt.get("ext"),
        "source": source_key or "yt-dlp",
    }


def _quality_sort_key(item: dict) -> tuple[int, int, int]:
    resolution = item.get("resolution") or {}
    height = resolution.get("height") or 0
    width = resolution.get("width") or 0
    bitrate = item.get("bitrate") or 0
    try:
        return (int(height), int(width), int(bitrate))
    except (TypeError, ValueError):
        logger.warning("Invalid quality sort values for %s", item.get("format_id") or item.get("variant"))
        return (0, 0, 0)


def _tikwm_quality_items(tikwm_data: dict | None) -> list[dict]:
    if not tikwm_data:
        return []

    items = []
    data = tikwm_data.get("data") or {}
    mapping = [
        ("play", data.get("play"), "play_addr"),
        ("wmplay", data.get("wmplay"), "wmplay_addr"),
        ("hdplay", data.get("hdplay"), "hdplay_addr"),
    ]
    for source_key, url, label in mapping:
        if not url:
            continue
        items.append(
            {
                "label": f"{_quality_access_icon(url, source_key)} {label}",
                "variant": label,
                "access": _quality_access_icon(url, source_key),
                "format_id": label,
                "url": url,
                "resolution": None,
                "original_resolution": None,
                "bitrate": None,
                "codec": "h264" if "play" in source_key else None,
                "file_size": data.get("size") if source_key == "play" else data.get("wm_size"),
                "vq_score": None,
                "fps": None,
                "ext": "mp4" if source_key != "wmplay" else "mp4",
                "source": f"tikwm:{source_key}",
            }
        )
    return items


def _merge_fillers(base: dict, fallback: dict | None) -> dict:
    if not fallback:
        return base
    merged = dict(base)
    if not merged.get("region"):
        merged["region"] = fallback.get("region")
    if not merged.get("source") or merged.get("source") in ("unknown", "Soon"):
        merged["source"] = fallback.get("source") or merged.get("source")
    if not merged.get("sound", {}).get("url"):
        merged.setdefault("sound", {})["url"] = fallback.get("sound", {}).get("url")
    if merged.get("stats", {}).get("downloads") is None:
        merged.setdefault("stats", {})["downloads"] = fallback.get("stats", {}).get("downloads")
    return merged


async def parse_raw_info(raw: dict, tikwm: dict | None = None) -> dict:
    tikwm_data = (tikwm or {}).get("data") if tikwm else None
    vid = raw.get("id") or extract_video_id(raw.get("webpage_url", ""))
    video_url = raw.get("webpage_url") or raw.get("original_url") or ""
    profile_url = raw.get("uploader_url") or raw.get("channel_url")
    username = raw.get("uploader") or raw.get("channel")
    nickname = raw.get("channel") or raw.get("uploader")
    posted_at = _timestamp_to_iso(raw.get("timestamp"))
    caption = raw.get("description") or raw.get("title") or ""

    tags = _extract_tags(raw)
    categories = _infer_categories(tags, caption)
    content_tips = _infer_content_tips(tags, caption)

    stats = {
        "views": raw.get("view_count"),
        "likes": raw.get("like_count"),
        "comments": raw.get("comment_count"),
        "favorites": raw.get("save_count"),
        "shares": raw.get("repost_count"),
        "downloads": raw.get("download_count"),
    }

    sound = {
        "title": raw.get("track"),
        "artists": raw.get("artists") or [],
        "url": _resolve_sound_url(raw, tikwm_data),
        "duration": raw.get("duration"),
    }

    original_resolution = None
    if raw.get("width") and raw.get("height"):
        original_resolution = f"{raw['width']}x{raw['height']}"

    vq_score = _format_vq_score(raw.get("quality"))

    formats = raw.get("formats") or []
    quality_items = []

    async def build_quality_item(fmt: dict):
        item = await _quality_item_from_format(fmt)
        if not item:
            return
        quality_items.append(item)

    await asyncio.gather(*(build_quality_item(fmt) for fmt in formats))

    tikwm_quality_items = _tikwm_quality_items(tikwm)
    seen_urls = {item["url"] for item in quality_items}
    for item in tikwm_quality_items:
        if item["url"] in seen_urls:
            continue
        quality_items.append(item)

    variant_counts = {}
    for item in quality_items:
        key = f"{item.get('access') or ''}|{item.get('variant') or ''}"
        variant_counts[key] = variant_counts.get(key, 0) + 1

    variant_seen = {}
    for item in quality_items:
        access = item.get("access") or _quality_access_icon(item.get("url"))
        variant = item.get("variant") or "unknown"
        key = f"{access}|{variant}"
        if variant_counts.get(key, 0) > 1:
            variant_seen[key] = variant_seen.get(key, 0) + 1
            variant = f"{variant}_{variant_seen[key]}"
        item["label"] = f"{access} {variant}"

    quality_items.sort(key=_quality_sort_key, reverse=True)

    source = raw.get("source") or "Soon"
    extractor = raw.get("extractor")
    region = raw.get("region")
    shadow_ban_status = "N/A"

    user = {
        "username": username,
        "nickname": nickname,
        "profile_url": profile_url,
    }

    base = {
        "video_id": vid,
        "id": vid,
        "video_url": video_url,
        "url": video_url,
        "user": user,
        "author": user,
        "profile_url": profile_url,
        "posted_at": posted_at,
        "created_at": posted_at,
        "caption": caption,
        "title": raw.get("title") or caption,
        "region": region,
        "shadow_ban_status": shadow_ban_status,
        "shadow_ban": shadow_ban_status,
        "sound": sound,
        "music": sound,
        "stats": stats,
        "source": source,
        "extractor": extractor,
        "original_resolution": original_resolution,
        "vq_score": vq_score,
        "qualities": quality_items,
        "quality": quality_items,
        "categories": categories,
        "tags": tags,
        "content_tips": content_tips,
        "tip": content_tips[0] if content_tips else None,
    }

    if tikwm_data:
        tikwm_sound = {
            "url": tikwm_data.get("music"),
            "duration": tikwm_data.get("duration"),
        }
        tikwm_base = {
            "region": tikwm_data.get("region"),
            "source": tikwm_data.get("source"),
            "sound": tikwm_sound,
            "stats": {
                "downloads": tikwm_data.get("download_count"),
            },
        }
        base = _merge_fillers(base, tikwm_base)

    return base
