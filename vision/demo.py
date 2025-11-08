from __future__ import annotations

import argparse
import base64
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from pipeline import VisionPipeline
    from schemas import Environment, FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata
else:  # pragma: no cover
    from .pipeline import VisionPipeline
    from .schemas import Environment, FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata

    
WINDOW_NAME = "AI-ATL Vision Demo"
WINDOW_YOLO = "Detections (YOLO)"
WINDOW_DEPTH = "Depth Map (MiDaS)"


def frame_to_base64(frame) -> str:
    ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        raise RuntimeError("Unable to encode frame for backend submission.")
    return base64.b64encode(encoded.tobytes()).decode("utf-8")


def draw_yolo_view(frame, response: FrameAnalysisResponse):
    view = frame.copy()
    h, w = view.shape[:2]
    for obj in response.objects:
        x_min = int(obj.bounding_box.x_min * w)
        y_min = int(obj.bounding_box.y_min * h)
        x_max = int(obj.bounding_box.x_max * w)
        y_max = int(obj.bounding_box.y_max * h)
        color = (0, 255, 0)
        cv2.rectangle(view, (x_min, y_min), (x_max, y_max), color, 2, cv2.LINE_AA)
        label = f"{obj.label} ({obj.confidence:.2f})"
        cv2.putText(
            view,
            label,
            (x_min, max(18, y_min - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA,
        )
    cv2.putText(
        view,
        "YOLO detections",
        (16, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    return view


def draw_response(frame, response: FrameAnalysisResponse, environment: Environment):
    annotated = frame.copy()
    h, w = frame.shape[:2]

    # 3x3 grid
    color_grid = (80, 80, 80)
    for i in range(1, 3):
        cv2.line(annotated, (i * w // 3, 0), (i * w // 3, h), color_grid, 1, cv2.LINE_AA)
        cv2.line(annotated, (0, i * h // 3), (w, i * h // 3), color_grid, 1, cv2.LINE_AA)

    for obj in response.objects:
        x_min = int(obj.bounding_box.x_min * w)
        y_min = int(obj.bounding_box.y_min * h)
        x_max = int(obj.bounding_box.x_max * w)
        y_max = int(obj.bounding_box.y_max * h)
        color = (0, 255, 255) if obj.quadrant.value == "center" else (0, 200, 0)
        cv2.rectangle(annotated, (x_min, y_min), (x_max, y_max), color, 2, cv2.LINE_AA)
        depth_text = f"{obj.relative_depth_m:.2f}" if obj.relative_depth_m is not None else "n/a"
        label = f"{obj.label} ({depth_text})"
        cv2.putText(
            annotated,
            label,
            (x_min, max(18, y_min - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA,
        )

    center = response.center_distance
    if center.distance_m is not None:
        center_text = f"Center depth (0-1): {center.distance_m:.2f}  conf={center.confidence or 0.0:.2f}"
    else:
        center_text = "Center depth unavailable"
    cv2.putText(
        annotated,
        center_text,
        (20, 32),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        annotated,
        f"Mode: {environment.value}",
        (20, 64),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (180, 255, 180),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        annotated,
        "Press Q/Esc to quit",
        (20, h - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (200, 200, 200),
        2,
        cv2.LINE_AA,
    )
    return annotated


def render_depth(depth_map: Optional[np.ndarray], shape: tuple[int, int]) -> np.ndarray:
    height, width = shape
    blank = np.zeros((height, width, 3), dtype=np.uint8)
    if depth_map is None:
        cv2.putText(
            blank,
            "Depth unavailable",
            (30, height // 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
        return blank
    normalized = np.clip(depth_map, 0.0, 1.0)
    depth_uint8 = (normalized * 255).astype(np.uint8)
    depth_color = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_TURBO)
    depth_color = cv2.resize(depth_color, (width, height))
    cv2.putText(
        depth_color,
        "MiDaS depth (0-1 scale, brighter = farther)",
        (20, 32),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    return depth_color


def log_packages(response: FrameAnalysisResponse, environment: Environment) -> None:
    print("\n" + "=" * 80)
    print(f"Frame {response.frame_id} (mode={environment.value})")
    print("Objects:")
    if not response.objects:
        print("  (none)")
    else:
        for obj in response.objects:
            depth = f"{obj.relative_depth_m:.2f}" if obj.relative_depth_m is not None else "n/a"
            print(
                f"  - {obj.label:<10} quadrant={obj.quadrant.value:<13} "
                f"depth(0-1)={depth:<6} conf={obj.confidence:.2f}"
            )
    center = response.center_distance
    print("Center distance:", center.distance_m, "confidence:", center.confidence, "advisory:", center.advisory)


def main(camera_index: int, environment: Environment) -> None:
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open webcam index {camera_index}")

    pipeline = VisionPipeline()
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.namedWindow(WINDOW_YOLO, cv2.WINDOW_NORMAL)
    cv2.namedWindow(WINDOW_DEPTH, cv2.WINDOW_NORMAL)
    metadata = None
    frame_id = 0
    last_log = 0.0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame. Exiting.")
                break

            height, width = frame.shape[:2]
            if metadata is None:
                metadata = FrameMetadata(width=width, height=height, focal_length_px=None)

            image_base64 = frame_to_base64(frame)
            request = FrameAnalysisRequest(
                frame_id=f"demo-{frame_id}",
                timestamp=datetime.utcnow(),
                frame_metadata=metadata,
                image_base64=image_base64,
                environment=environment,
            )

            response = pipeline.process(request)
            annotated = draw_response(frame, response, environment)
            yolo_view = draw_yolo_view(frame, response)
            depth_map = pipeline.last_depth_map
            depth_view = render_depth(depth_map, frame.shape[:2])

            now = time.time()
            if now - last_log > 1.5:
                log_packages(response, environment)
                last_log = now

            cv2.imshow(WINDOW_NAME, annotated)
            cv2.imshow(WINDOW_YOLO, yolo_view)
            cv2.imshow(WINDOW_DEPTH, depth_view)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            frame_id += 1
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the AI-ATL Vision demo with webcam input.")
    parser.add_argument("--camera", type=int, default=0, help="Webcam index to use (default: 0).")
    parser.add_argument(
        "--environment",
        choices=[Environment.INDOOR.value, Environment.OUTDOOR.value],
        default=Environment.INDOOR.value,
        help="Choose indoor or outdoor pipeline (default: indoor).",
    )
    args = parser.parse_args()
    main(args.camera, Environment(args.environment))
