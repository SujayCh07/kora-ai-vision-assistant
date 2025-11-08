from __future__ import annotations

import sys
from pathlib import Path

import base64
import json
import time
from io import BytesIO

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from pipeline import VisionPipeline
    from schemas import FrameAnalysisRequest, FrameAnalysisResponse
else:  # pragma: no cover
    from .pipeline import VisionPipeline
    from .schemas import FrameAnalysisRequest, FrameAnalysisResponse

app = FastAPI(
    title="AI-ATL Blind Assistance - Kora",
    version="2.0.0",
    description="Real-time vision assistance with WebSocket streaming, YOLO object detection, and MiDaS depth estimation.",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time frame analysis.

    Client sends: {"type": "frame", "data": "base64_image", "timestamp": 123456}
    Server sends: {"type": "detection", "objects": [...], "fps": 10, "message": "..."}
    """
    await websocket.accept()
    print("WebSocket client connected")

    frame_count = 0
    start_time = time.time()

    try:
        while True:
            # Receive frame from client
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "frame":
                # Decode base64 image
                frame_data = message.get("data", "")

                # Remove data URL prefix if present
                if "," in frame_data:
                    frame_data = frame_data.split(",")[1]

                # Decode base64 to image
                try:
                    img_bytes = base64.b64decode(frame_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is None:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Failed to decode image"
                        })
                        continue

                    # Convert frame to base64 for pipeline
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')

                    # Process frame through vision pipeline
                    request = FrameAnalysisRequest(
                        image_data=frame_base64,
                        environment="indoor"
                    )

                    response = pipeline.process(request)

                    # Calculate FPS
                    frame_count += 1
                    elapsed = time.time() - start_time
                    fps = frame_count / elapsed if elapsed > 0 else 0

                    # Format objects for frontend
                    objects = []
                    for obj in response.detected_objects:
                        objects.append({
                            "bbox": [obj.bbox_x, obj.bbox_y, obj.bbox_width, obj.bbox_height],
                            "label": obj.class_name,
                            "confidence": obj.confidence,
                            "distance": obj.depth_center if obj.depth_center else None,
                            "quadrant": obj.quadrant
                        })

                    # Generate voice message based on detections
                    message = generate_guidance_message(response)

                    # Send detection result
                    await websocket.send_json({
                        "type": "detection",
                        "objects": objects,
                        "fps": round(fps, 1),
                        "message": message,
                        "center_distance": response.center_distance_summary,
                        "timestamp": message.get("timestamp", time.time())
                    })

                except Exception as e:
                    print(f"Error processing frame: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Processing error: {str(e)}"
                    })

            elif message.get("type") == "describe":
                # Send a detailed scene description
                await websocket.send_json({
                    "type": "description",
                    "message": "Analyzing scene...",
                })

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


def generate_guidance_message(response: FrameAnalysisResponse) -> str:
    """
    Generate a concise voice guidance message based on detection results.
    """
    objects = response.detected_objects

    if not objects:
        return "Path clear"

    # Find closest object in center region
    center_objects = [obj for obj in objects if obj.quadrant == 4]  # Center quadrant

    if center_objects:
        closest = min(center_objects, key=lambda x: x.depth_center if x.depth_center else float('inf'))
        distance = closest.depth_center if closest.depth_center else 0

        if distance < 0.3:
            return f"Stop! {closest.class_name} directly ahead, very close"
        elif distance < 0.5:
            return f"Caution, {closest.class_name} ahead at {distance:.1f} meters"
        else:
            return f"{closest.class_name} ahead"

    # Check left/right objects
    left_objects = [obj for obj in objects if obj.quadrant in [0, 3, 6]]  # Left columns
    right_objects = [obj for obj in objects if obj.quadrant in [2, 5, 8]]  # Right columns

    if left_objects and not right_objects:
        return f"Object on the left, path clear on right"
    elif right_objects and not left_objects:
        return f"Object on the right, path clear on left"

    return f"{len(objects)} objects detected"
