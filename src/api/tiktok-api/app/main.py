import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.video import router as video_router
from .config import settings

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("main")

app = FastAPI(
    title="TikTok Video Analytics API",
    description="Public metadata extraction + FPS detection + video download",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video_router)

@app.on_event("startup")
async def startup():
    logger.info("TikTok Analytics API v2 started")

@app.get("/")
async def root():
    return {"message": "TikTok Analytics API v2. Use /docs"}
