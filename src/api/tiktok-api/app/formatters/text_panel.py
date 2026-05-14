from datetime import datetime


def _fmt(value, label):
    if value is None:
        return f"  - N/A {label}"
    return f"  - {value:,} {label}"


def _fmt_size(value):
    if value is None:
        return "N/A"
    mb = value / (1024 * 1024)
    return f"{mb:.1f} MB"


def build_text_panel(data: dict) -> str:
    lines = [f"VIDEO ANALYTICS: {data.get('video_url') or data.get('url')}", ""]

    user = data.get("user") or data.get("author") or {}
    posted_at = data.get("posted_at") or data.get("created_at")
    if posted_at:
        dt = datetime.fromisoformat(posted_at)
        lines.append(f"User: {user.get('nickname') or user.get('username') or 'N/A'}")
        lines.append(f"Profile: {user.get('profile_url') or 'N/A'}")
        lines.append(f"Posted at: {dt.isoformat(sep=' ', timespec='seconds')}")
    else:
        lines.append(f"User: {user.get('nickname') or user.get('username') or 'N/A'}")
        lines.append(f"Profile: {user.get('profile_url') or 'N/A'}")

    caption = data.get("caption") or data.get("title") or ""
    if caption:
        lines.append(f"Caption: {caption}")
    lines.append("")

    sound = data.get("sound") or data.get("music") or {}
    lines.append("Sound")
    lines.append(f"  - Title: {sound.get('title') or 'N/A'}")
    lines.append(f"  - URL: {sound.get('url') or 'N/A'}")
    if sound.get("duration") is not None:
        duration = int(sound["duration"])
        lines.append(f"  - Duration: {duration}s")
    if sound.get("artists"):
        lines.append(f"  - Artists: {', '.join(sound['artists'])}")
    lines.append("")

    lines.append("Statistics")
    stats = data.get("stats", {})
    lines.append(_fmt(stats.get("views"), "views"))
    lines.append(_fmt(stats.get("likes"), "likes"))
    lines.append(_fmt(stats.get("comments"), "comments"))
    lines.append(_fmt(stats.get("favorites"), "favorites"))
    lines.append(_fmt(stats.get("shares"), "shares"))
    lines.append(_fmt(stats.get("downloads"), "downloads"))
    lines.append("")

    lines.append("Info")
    lines.append(f"  - Video ID: {data.get('video_id') or data.get('id') or 'N/A'}")
    lines.append(f"  - Source: {data.get('source') or 'Soon'}")
    lines.append(f"  - Region: {data.get('region') or 'N/A'}")
    lines.append(f"  - Shadow ban: {data.get('shadow_ban_status') or 'N/A'}")
    if data.get("original_resolution"):
        lines.append(f"  - Original resolution: {data.get('original_resolution')}")
    if data.get("vq_score") is not None:
        lines.append(f"  - VQ Score: {data.get('vq_score')}")
    lines.append("")

    lines.append("Qualities")
    for item in data.get("qualities") or data.get("quality") or []:
        resolution = item.get("resolution") or {}
        width = resolution.get("width") or "?"
        height = resolution.get("height") or "?"
        bitrate = item.get("bitrate")
        bitrate_str = f"{bitrate/1000:.1f} Mbps" if bitrate else "N/A"
        codec = item.get("codec") or "N/A"
        file_size = _fmt_size(item.get("file_size"))
        label = item.get("label") or item.get("format_id") or "unknown"
        lines.append(f"  - {label}")
        lines.append(f"    label: {item.get('format_id') or 'N/A'}")
        lines.append(f"    url: {item.get('url') or 'N/A'}")
        if item.get("original_resolution"):
            lines.append(f"    original_resolution: {item.get('original_resolution')}")
        lines.append(f"    resolution: {width}x{height}")
        lines.append(f"    bitrate: {bitrate_str}")
        lines.append(f"    codec: {codec}")
        lines.append(f"    file_size: {file_size}")
        if item.get("vq_score") is not None:
            lines.append(f"    vq_score: {item.get('vq_score')}")
    lines.append("")

    categories = data.get("categories") or []
    tags = data.get("tags") or []
    tips = data.get("content_tips") or []
    lines.append("Categories")
    lines.append("  - " + (", ".join(categories) if categories else "N/A"))
    lines.append("Tags")
    lines.append("  - " + (", ".join(tags) if tags else "N/A"))
    lines.append("Content tips")
    lines.append("  - " + (", ".join(tips) if tips else "N/A"))

    return "\n".join(lines)
