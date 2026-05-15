import os

class Settings:
    CACHE_TTL = int(os.getenv("CACHE_TTL", 600))
    CACHE_MAXSIZE = int(os.getenv("CACHE_MAXSIZE", 100))
    YTDLP_TIMEOUT = int(os.getenv("YTDLP_TIMEOUT", 30))
    YTDLP_DOWNLOAD_TIMEOUT = int(os.getenv("YTDLP_DOWNLOAD_TIMEOUT", 180))
    TIKWM_TIMEOUT = int(os.getenv("TIKWM_TIMEOUT", 20))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
