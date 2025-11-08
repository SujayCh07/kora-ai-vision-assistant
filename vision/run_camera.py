from __future__ import annotations

import base64
import time
import uuid
from datetime import datetime

import cv2

import sys
from pathlib import Path

if __package__ in (None, ""):
    # allow running this file directly (python vision/run_camera.py)
    # by adding the vision package dir and repo root to sys.path so
    # imports for sibling packages work.
    repo_dir = str(Path(__file__).resolve().parent.parent)
    vision_dir = str(Path(__file__).resolve().parent)
    sys.path.insert(0, repo_dir)
    sys.path.insert(0, vision_dir)
    from pipeline import VisionPipeline
    from schemas import FrameAnalysisRequest, FrameMetadata, Environment
else:
    from .pipeline import VisionPipeline
    from .schemas import FrameAnalysisRequest, FrameMetadata, Environment

try:
    from SnowFlake.processor import SnowflakeRiskProcessor
except Exception:
    # fallback: ensure repo root is on path and import
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from SnowFlake.processor import SnowflakeRiskProcessor


def frame_to_base64(frame) -> str:
    ret, buf = cv2.imencode('.jpg', frame)
    if not ret:
        raise RuntimeError('Failed to encode frame')
    return base64.b64encode(buf.tobytes()).decode('ascii')


def run_camera_loop(device_index: int = 0, fps_limit: float = 1.0) -> None:
    def _try_open(idx: int):
        # Try a few common backends on macOS to improve camera compatibility.
        backends = [None]
        # Add AVFoundation if available (macOS)
        if hasattr(cv2, "CAP_AVFOUNDATION"):
            backends.append(cv2.CAP_AVFOUNDATION)
        # Generic any
        if hasattr(cv2, "CAP_ANY"):
            backends.append(cv2.CAP_ANY)

        last_exc = None
        for b in backends:
            try:
                if b is None:
                    cap_try = cv2.VideoCapture(idx)
                else:
                    cap_try = cv2.VideoCapture(idx, b)
                print(f"Tried VideoCapture(idx={idx}, backend={b}) -> isOpened={cap_try.isOpened()}")
                if cap_try.isOpened():
                    return cap_try
                cap_try.release()
            except Exception as exc:
                last_exc = exc
                print(f"VideoCapture attempt failed for backend={b}: {exc}")
        if last_exc:
            raise last_exc
        return None

    cap = _try_open(device_index)
    if cap is None or not cap.isOpened():
        raise RuntimeError(f"Unable to open camera device {device_index}. Check macOS camera permissions and that no other app is using the camera.")

    print(f"Camera opened: isOpened={cap.isOpened()}")

    pipeline = VisionPipeline()
    processor = SnowflakeRiskProcessor(min_speak_interval_s=3.0)

    print("Starting camera loop. Press Ctrl+C to stop.")
    last_time = 0.0
    try:
        while True:
            now = time.time()
            if now - last_time < 1.0 / fps_limit:
                time.sleep(0.01)
                continue
            last_time = now

            ret, frame = cap.read()
            print(f"cap.read() returned: {ret}, frame is None: {frame is None}")
            if not ret or frame is None:
                print("Failed to read frame from camera. Will retry after short delay.")
                time.sleep(0.5)
                # continue instead of breaking so we can tolerate transient read failures
                continue

            h, w = frame.shape[:2]
            img_b64 = frame_to_base64(frame)
            payload = FrameAnalysisRequest(
                frame_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                frame_metadata=FrameMetadata(width=w, height=h),
                image_base64=img_b64,
                environment=Environment.OUTDOOR,
            )

            try:
                response = pipeline.process(payload)
                msg = processor.process_frame(response)
                if msg:
                    print(f"Spoken alert: {msg}")
            except Exception as exc:
                print(f"Error processing frame: {exc}")

    except KeyboardInterrupt:
        print("Camera loop interrupted by user.")
    finally:
        cap.release()


if __name__ == "__main__":
    run_camera_loop()
