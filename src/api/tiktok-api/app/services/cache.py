import os

from cachetools import TTLCache


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


cache = TTLCache(
    maxsize=_int_env("CACHE_MAXSIZE", 100),
    ttl=_int_env("CACHE_TTL", 600),
)
