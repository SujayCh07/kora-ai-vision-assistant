from __future__ import annotations

import base64
import sys
from pathlib import Path
from typing import Optional

import base64
import json
import time
from io import BytesIO

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from integrations.elevenlabs_bridge import ElevenLabsBridge
    from integrations.snowflake_client import SnowflakeLLM
    from pipeline import VisionPipeline
    from schemas import FrameAnalysisRequest, FrameAnalysisResponse
else:  # pragma: no cover
    from .integrations.elevenlabs_bridge import ElevenLabsBridge
    from .integrations.snowflake_client import SnowflakeLLM
    from .pipeline import VisionPipeline
    from .schemas import FrameAnalysisRequest, FrameAnalysisResponse

settings = get_settings()

app = FastAPI(
    title="AI-ATL Blind Assistance",    
    version="1.0.0",
    description="End-to-end pipeline using YOLO (object detection) + MiDaS (depth).",
)

pipeline = VisionPipeline()
_elevenlabs_client: Optional[ElevenLabsBridge] = None
_snowflake_llm: Optional[SnowflakeLLM] = None
DEFAULT_PROMPT = (
    "You are SnowFlake, a concise mobility assistant for blind travelers. Combine the vision context with the user" 
    " request and respond in under 80 words, prioritizing safety cues."
)


def get_elevenlabs_client() -> ElevenLabsBridge:
    global _elevenlabs_client
    if _elevenlabs_client is None:
        api_key = settings.elevenlabs_api_key
        if not api_key:
            raise RuntimeError("ELEVENLABS_API_KEY must be set to enable transcription/TTS features.")
        _elevenlabs_client = ElevenLabsBridge(api_key=api_key)
    return _elevenlabs_client


def get_snowflake_llm() -> SnowflakeLLM:
    global _snowflake_llm
    if _snowflake_llm is None:
        account = settings.snowflake_account
        user = settings.snowflake_user
        password = settings.snowflake_password
        if not (account and user and password):
            raise RuntimeError(
                "SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_PASSWORD must be configured for the LLM branch."
            )
        _snowflake_llm = SnowflakeLLM(
            account=account,
            user=user,
            password=password,
            role=settings.snowflake_role,
            warehouse=settings.snowflake_warehouse,
            database=settings.snowflake_database,
            schema=settings.snowflake_schema,
            model=settings.snowflake_model,
        )
    return _snowflake_llm


def build_llm_prompt(instructions: Optional[str], vision_summary: str, user_text: str) -> str:
    system = (instructions or DEFAULT_PROMPT).strip()
    return (
        f"{system}\n\n"
        f"Vision context:\n{vision_summary}\n\n"
        f"User request:\n{user_text}\n\n"
        "Respond in the assistant's voice with concrete guidance."
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=FrameAnalysisResponse)
async def analyze(payload: FrameAnalysisRequest) -> FrameAnalysisResponse:
    try:
        response = pipeline.process(payload)
    except Exception as exc:  # pragma: no cover - surfaced via HTTP
        raise HTTPException(status_code=500, detail=str(exc)) from exc
