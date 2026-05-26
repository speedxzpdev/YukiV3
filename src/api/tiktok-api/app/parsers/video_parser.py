import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger("video_parser")
SHORT_TIKTOK_RE = re.compile(
    r"^https?://(?:www\.)?(?:vm|vt)\.tiktok\.com/[A-Za-z0-9_-]+/?(?:[?#].*)?$",
    re.IGNORECASE,
)

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


def is_tiktok_short_url(url_or_id: str | None) -> bool:
    return bool(SHORT_TIKTOK_RE.match(str(url_or_id or "").strip()))


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


def _to_int(value, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _known_resolution(resolution: dict | None) -> bool:
    if not isinstance(resolution, dict):
        return False
    return bool(_to_int(resolution.get("width")) and _to_int(resolution.get("height")))


def _best_known_fps(raw: dict, formats: list[dict]) -> int | None:
    fps_values = [raw.get("fps")]
    fps_values.extend(fmt.get("fps") for fmt in formats)
    known = [_to_int(value) for value in fps_values if _to_int(value) > 0]
    return max(known) if known else None


def _codec_score(codec: str | None) -> int:
    normalized = str(codec or "").lower()
    if "av1" in normalized:
        return 4
    if "h265" in normalized or "hevc" in normalized:
        return 3
    if "h264" in normalized or "avc" in normalized:
        return 2
    return 1 if normalized and normalized != "none" else 0


def _watermark_penalty(item: dict) -> int:
    return 0 if item.get("watermarked") else 1


def _quality_source_score(item: dict) -> int:
    source = str(item.get("source") or "")
    if source == "yt-dlp":
        return 3
    if source.startswith("tikwm:"):
        return 2
    return 1


def _effective_bitrate(item: dict, duration: int | float | None) -> int:
    bitrate = _to_int(item.get("bitrate"))
    if bitrate > 0:
        return bitrate

    file_size = _to_int(item.get("file_size"))
    duration_value = _to_int(duration)
    if file_size > 0 and duration_value > 0:
        return int((file_size * 8) / duration_value / 1000)
    return 0


def _metadata_completeness(item: dict) -> int:
    resolution = item.get("resolution") or {}
    fields = [
        _to_int(resolution.get("width")) > 0,
        _to_int(resolution.get("height")) > 0,
        _to_int(item.get("fps")) > 0,
        _to_int(item.get("bitrate")) > 0,
        bool(item.get("codec")),
        _to_int(item.get("file_size")) > 0,
    ]
    return sum(1 for field in fields if field)


def _quality_score(item: dict, duration: int | float | None) -> list[int]:
    resolution = item.get("resolution") or {}
    pixels = _to_int(resolution.get("width")) * _to_int(resolution.get("height"))
    fps = _to_int(item.get("fps"))
    file_size = _to_int(item.get("file_size"))

    return [
        pixels,
        fps,
        _effective_bitrate(item, duration),
        file_size,
        _watermark_penalty(item),
        _codec_score(item.get("codec")),
        _quality_source_score(item),
        _metadata_completeness(item),
    ]


def _fill_quality_metadata(item: dict, fallback_resolution: dict | None, fallback_fps: int | None) -> None:
    if not _known_resolution(item.get("resolution")) and _known_resolution(fallback_resolution):
        item["resolution"] = {
            "width": fallback_resolution.get("width"),
            "height": fallback_resolution.get("height"),
        }
        item["original_resolution"] = f"{fallback_resolution['width']}x{fallback_resolution['height']}"
        item["metadata_fallback"] = "video"

    if not item.get("fps") and fallback_fps:
        item["fps"] = fallback_fps
        item["metadata_fallback"] = item.get("metadata_fallback") or "video"


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
    format_note = fmt.get("format_note")
    watermarked = "watermarked" in str(format_note or "").lower() or fmt.get("format_id") == "download"
    return {
        "label": _pick_quality_label(fmt, source_key),
        "variant": _clean_quality_name(fmt, source_key),
        "access": _quality_access_icon(url, source_key),
        "format_id": fmt.get("format_id"),
        "format_note": format_note,
        "url": url,
        "resolution": resolution,
        "original_resolution": fmt.get("resolution"),
        "bitrate": fmt.get("tbr"),
        "codec": fmt.get("vcodec") or fmt.get("acodec"),
        "file_size": _format_size(fmt.get("filesize") or fmt.get("filesize_approx")),
        "vq_score": _format_vq_score(fmt.get("quality")),
        "fps": fps,
        "ext": fmt.get("ext"),
        "watermarked": watermarked,
        "source": source_key or "yt-dlp",
    }


def _quality_sort_key(item: dict) -> tuple[int, int, int]:
    score = item.get("quality_score")
    if isinstance(score, list):
        return tuple(score)

    resolution = item.get("resolution") or {}
    return (
        _to_int(resolution.get("width")) * _to_int(resolution.get("height")),
        _to_int(item.get("fps")),
        _to_int(item.get("bitrate")),
        _to_int(item.get("file_size")),
    )


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
                "format_note": None,
                "url": url,
                "resolution": None,
                "original_resolution": None,
                "bitrate": None,
                "codec": "h264" if "play" in source_key else None,
                "file_size": data.get("size") if source_key == "play" else data.get("wm_size"),
                "vq_score": None,
                "fps": None,
                "ext": "mp4" if source_key != "wmplay" else "mp4",
                "watermarked": source_key == "wmplay",
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
    fallback_resolution = None
    if raw.get("width") and raw.get("height"):
        original_resolution = f"{raw['width']}x{raw['height']}"
        fallback_resolution = {
            "width": raw.get("width"),
            "height": raw.get("height"),
        }

    vq_score = _format_vq_score(raw.get("quality"))

    formats = raw.get("formats") or []
    fallback_fps = _best_known_fps(raw, formats)
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
        _fill_quality_metadata(item, fallback_resolution, fallback_fps)
        item["effective_bitrate"] = _effective_bitrate(item, raw.get("duration"))
        item["quality_score"] = _quality_score(item, raw.get("duration"))
        access = item.get("access") or _quality_access_icon(item.get("url"))
        variant = item.get("variant") or "unknown"
        key = f"{access}|{variant}"
        if variant_counts.get(key, 0) > 1:
            variant_seen[key] = variant_seen.get(key, 0) + 1
            variant = f"{variant}_{variant_seen[key]}"
        item["label"] = f"{access} {variant}"

    quality_items.sort(key=_quality_sort_key, reverse=True)
    best_quality = quality_items[0] if quality_items else None
    for index, item in enumerate(quality_items, start=1):
        item["quality_rank"] = index
        item["is_best"] = index == 1

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
        "best_quality": best_quality,
        "download_quality": best_quality,
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
