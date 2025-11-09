from __future__ import annotations

import base64
from datetime import datetime
import sys
from pathlib import Path
from typing import Optional, Tuple
from uuid import uuid4

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from ElevenLabs.main import get_assistant

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from integrations.snowflake_client import SnowflakeLLM
    from pipeline import VisionPipeline
    from schemas import FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata, Environment
else:  # pragma: no cover
    from .integrations.snowflake_client import SnowflakeLLM
    from .pipeline import VisionPipeline
    from .schemas import FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata, Environment


settings = get_settings()
assistant = get_assistant()
pipeline = VisionPipeline()
_snowflake_llm: Optional[SnowflakeLLM] = None
_last_response: Optional[FrameAnalysisResponse] = None
_last_dimensions: Tuple[int, int] = (640, 480)

app = FastAPI(
    title="AI-ATL Blind Assistance",
    version="1.0.0",
    description="Receives vision frames + optional audio, runs MiDaS/YOLO, and enriches the payload with Snowflake responses.",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_snowflake_llm() -> SnowflakeLLM:
    global _snowflake_llm
    if _snowflake_llm is None:
        account = settings.snowflake_account
        user = settings.snowflake_user
        password = settings.snowflake_password
        if not (account and user and password):
            raise RuntimeError("SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_PASSWORD must be configured.")
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


def _strip_data_url(data: str) -> str:
    if not data:
        return data
    if ',' in data:
        prefix, encoded = data.split(',', 1)
        if 'base64' in prefix:
            return encoded
    return data


def _resolve_dimensions(payload: dict, fallback: Tuple[int, int]) -> Tuple[int, int]:
    width_raw = payload.get('width')
    height_raw = payload.get('height')
    try:
        width = int(width_raw)
    except (TypeError, ValueError):
        width = fallback[0]
    try:
        height = int(height_raw)
    except (TypeError, ValueError):
        height = fallback[1]
    return max(width, 1), max(height, 1)


def _serialize_detection(response: FrameAnalysisResponse, dimensions: Tuple[int, int]) -> dict:
    width, height = dimensions
    objects = []
    for obj in response.objects:
        bbox = obj.bounding_box
        objects.append({
            'label': obj.label,
            'confidence': obj.confidence,
            'bbox': [
                float(bbox.x_min * width),
                float(bbox.y_min * height),
                float(bbox.x_max * width),
                float(bbox.y_max * height),
            ],
            'distance': obj.relative_depth_m,
            'quadrant': obj.quadrant.value,
        })

    payload = {
        'type': 'detection',
        'frame_id': response.frame_id,
        'objects': objects,
        'center_distance': response.center_distance.model_dump(),
        'message': response.vision_summary,
        'notes': response.notes,
        'llm_response': response.llm_response,
        'user_transcript': response.user_transcript,
        'dimensions': {'width': width, 'height': height},
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }

    if response.audio_response_base64:
        payload['audio_response_base64'] = response.audio_response_base64

    return payload


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "status", "message": "Connected to Kora vision service."})
    global _last_response, _last_dimensions

    try:
        while True:
            try:
                payload = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception as exc:
                await websocket.send_json({"type": "error", "message": f"Invalid message format: {exc}"})
                continue

            message_type = payload.get("type")
            if message_type == "frame":
                raw_data = payload.get("data")
                if not raw_data:
                    await websocket.send_json({"type": "error", "message": "Frame payload missing data."})
                    continue

                dimensions = _resolve_dimensions(payload, _last_dimensions)
                environment_value = payload.get("environment", Environment.INDOOR.value)
                try:
                    environment = Environment(environment_value)
                except ValueError:
                    environment = Environment.INDOOR

                request = FrameAnalysisRequest(
                    frame_id=payload.get("frame_id") or str(uuid4()),
                    timestamp=datetime.utcnow(),
                    frame_metadata=FrameMetadata(width=dimensions[0], height=dimensions[1]),
                    image_base64=_strip_data_url(raw_data),
                    environment=environment,
                )

                try:
                    response = await run_in_threadpool(pipeline.process, request)
                except Exception as exc:
                    await websocket.send_json({"type": "error", "message": f"Vision pipeline error: {exc}"})
                    continue

                _last_response = response
                _last_dimensions = dimensions
                await websocket.send_json(_serialize_detection(response, dimensions))

            elif message_type == "describe":
                if _last_response is None:
                    await websocket.send_json({"type": "status", "message": "No frames processed yet."})
                    continue
                await websocket.send_json(_serialize_detection(_last_response, _last_dimensions))
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {message_type}"})
    except WebSocketDisconnect:
        return


@app.post("/analyze", response_model=FrameAnalysisResponse)
async def analyze(payload: FrameAnalysisRequest) -> FrameAnalysisResponse:
    try:
        response = pipeline.process(payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    update_data: dict[str, Optional[str]] = {}
    if payload.audio_base64:
        try:
            transcript = assistant.transcribe_base64(payload.audio_base64)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Audio transcription failed: {exc}") from exc

        update_data["user_transcript"] = transcript
        if transcript:
            prompt = assistant.build_prompt(
                vision_summary=response.vision_summary,
                user_text=transcript,
                instructions=payload.prompt_instructions,
                conversation_history=[],
            )
            try:
                llm_text = get_snowflake_llm().complete(prompt)
            except Exception as exc:
                raise HTTPException(status_code=502, detail=f"Snowflake LLM error: {exc}") from exc
            update_data["llm_response"] = llm_text

            if payload.synthesize_voice:
                try:
                    audio_bytes = assistant.synthesize(llm_text)
                except Exception as exc:
                    raise HTTPException(status_code=502, detail=f"ElevenLabs synthesis failed: {exc}") from exc
                update_data["audio_response_base64"] = base64.b64encode(audio_bytes).decode("utf-8")
        else:
            update_data["llm_response"] = None

    if update_data:
        response = response.model_copy(update=update_data)
    return response
