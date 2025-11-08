from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from pipeline import VisionPipeline
    from schemas import FrameAnalysisRequest, FrameAnalysisResponse
else:  # pragma: no cover
    from .pipeline import VisionPipeline
    from .schemas import FrameAnalysisRequest, FrameAnalysisResponse

app = FastAPI(
    title="AI-ATL Blind Assistance",    
    version="1.0.0",
    description="End-to-end pipeline using YOLO (object detection) + MiDaS (depth).",
)

pipeline = VisionPipeline()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=FrameAnalysisResponse)
async def analyze(payload: FrameAnalysisRequest) -> FrameAnalysisResponse:
    try:
        return pipeline.process(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
