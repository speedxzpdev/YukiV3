import asyncio
import subprocess
import tempfile
import os
import aiohttp
import logging

logger = logging.getLogger("video_utils")

async def get_fps_from_url(video_url: str, timeout: int = 10) -> float | None:
    """Baixa uma pequena amostra do video e extrai o FPS com ffprobe."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(video_url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status != 200:
                    return None
                # Baixa apenas os primeiros 512 KB
                chunk = await resp.content.read(512 * 1024)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(chunk)
                    tmp_path = tmp.name

        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=r_frame_rate",
            "-of", "default=noprint_wrappers=1:nokey=1",
            tmp_path
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
        os.unlink(tmp_path)
        if proc.returncode != 0:
            return None
        rate_str = stdout.decode().strip()
        if '/' in rate_str:
            num, den = rate_str.split('/')
            return float(num) / float(den)
        else:
            return float(rate_str)
    except Exception as e:
        logger.warning(f"FPS extraction failed: {e}")
        return None

def get_best_format(formats: list, quality: str = "highest") -> dict | None:
    """Seleciona o formato de acordo com o criterio de qualidade."""
    video_formats = [f for f in formats if f.get("vcodec") != "none" and f.get("width")]
    if not video_formats:
        return None
    if quality == "highest":
        return max(video_formats, key=lambda x: (x.get("height", 0), x.get("tbr", 0)))
    elif quality == "medium":
        target = [f for f in video_formats if f.get("height") == 720]
        if target:
            return max(target, key=lambda x: x.get("tbr", 0))
        candidates = [f for f in video_formats if f.get("height", 0) >= 360]
        if candidates:
            return min(candidates, key=lambda x: x.get("height", 0))
        return video_formats[-1]
    elif quality == "audio":
        for f in formats:
            if f.get("vcodec") == "none" and f.get("acodec") != "none":
                return f
        return None
    else:
        for f in formats:
            if f.get("format_id") == quality:
                return f
        return None