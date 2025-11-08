from __future__ import annotations

import base64
from typing import List, Optional

import cv2
import numpy as np
import torch
from ultralytics import YOLO

try:
    from .schemas import (
        BoundingBox,
        CenterDistanceSummary,
        DetectedObject,
        FrameAnalysisRequest,
        FrameAnalysisResponse,
        Quadrant,
    )
except ImportError:  # pragma: no cover - support script execution
    from schemas import (
        BoundingBox,
        CenterDistanceSummary,
        DetectedObject,
        FrameAnalysisRequest,
        FrameAnalysisResponse,
        Quadrant,
    )


class MiDaSDepthEstimator:
    """Wraps Intel's MiDaS models via torch.hub."""

    def __init__(self, model_type: str = "MiDaS_small", device: str | None = None) -> None:
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = torch.hub.load("intel-isl/MiDaS", model_type).to(self.device)
        self.model.eval()
        transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        self.transform = transforms.dpt_transform if "DPT" in model_type else transforms.small_transform

    @torch.inference_mode()
    def predict(self, frame_bgr: np.ndarray) -> np.ndarray:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        input_batch = self.transform(rgb).to(self.device)
        prediction = self.model(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=rgb.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()
        depth = prediction.cpu().numpy()
        depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-6)
        return depth


class VisionPipeline:
    def __init__(
        self,
        detector_weights: str = "yolov8n.pt",
        depth_model_type: str = "MiDaS_small",
    ) -> None:
        self.detector = YOLO(detector_weights)
        self.depth_model = MiDaSDepthEstimator(model_type=depth_model_type)
        self._last_depth_map: Optional[np.ndarray] = None

    def process(self, payload: FrameAnalysisRequest) -> FrameAnalysisResponse:
        frame = self._decode_frame(payload.image_base64)
        depth_map = self.depth_model.predict(frame)
        self._last_depth_map = depth_map
        objects = self._run_detection(frame, depth_map)
        center_summary = self._summarize_center(depth_map, payload.frame_metadata.width, payload.frame_metadata.height)
        return FrameAnalysisResponse(
            frame_id=payload.frame_id,
            objects=objects,
            center_distance=center_summary,
            notes=(
                "Detections via YOLO; depth via MiDaS normalized 0-1 (relative scale). "
                "Convert to metric units in a downstream stage if calibration data is available."
            ),
        )

    @property
    def last_depth_map(self) -> Optional[np.ndarray]:
        return None if self._last_depth_map is None else self._last_depth_map.copy()

    def _decode_frame(self, image_base64: str) -> np.ndarray:
        buffer = base64.b64decode(image_base64)
        arr = np.frombuffer(buffer, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Unable to decode provided image_base64")
        return frame

    def _run_detection(self, frame: np.ndarray, depth_map: np.ndarray) -> List[DetectedObject]:
        results = self.detector.predict(source=frame, verbose=False)[0]
        objects: List[DetectedObject] = []
        height, width = frame.shape[:2]
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            bbox = BoundingBox(
                x_min=max(0.0, x1 / width),
                y_min=max(0.0, y1 / height),
                x_max=min(1.0, x2 / width),
                y_max=min(1.0, y2 / height),
            )
            label = results.names[int(box.cls)]
            confidence = float(box.conf)
            quadrant = self._quadrant_from_bbox(bbox)
            center = bbox.center
            depth_value = depth_map[int(center[1] * height), int(center[0] * width)]
            depth_m = float(depth_value)
            objects.append(
                DetectedObject(
                    label=label,
                    confidence=confidence,
                    bounding_box=bbox,
                    quadrant=quadrant,
                    relative_depth_m=depth_m,
                )
            )
        return objects

    def _quadrant_from_bbox(self, bbox: BoundingBox) -> Quadrant:
        cx, cy = bbox.center
        col = 0 if cx < 1 / 3 else (1 if cx < 2 / 3 else 2)
        row = 0 if cy < 1 / 3 else (1 if cy < 2 / 3 else 2)
        mapping: dict[tuple[int, int], Quadrant] = {
            (0, 0): Quadrant.TOP_LEFT,
            (1, 0): Quadrant.TOP_CENTER,
            (2, 0): Quadrant.TOP_RIGHT,
            (0, 1): Quadrant.MIDDLE_LEFT,
            (1, 1): Quadrant.CENTER,
            (2, 1): Quadrant.MIDDLE_RIGHT,
            (0, 2): Quadrant.BOTTOM_LEFT,
            (1, 2): Quadrant.BOTTOM_CENTER,
            (2, 2): Quadrant.BOTTOM_RIGHT,
        }
        return mapping[(col, row)]

    def _summarize_center(self, depth_map: np.ndarray, width: int, height: int) -> CenterDistanceSummary:
        h, w = depth_map.shape
        x_start = w // 3
        x_end = 2 * w // 3
        y_start = h // 3
        y_end = 2 * h // 3
        center_region = depth_map[y_start:y_end, x_start:x_end]
        valid = center_region[np.isfinite(center_region)]
        if valid.size == 0:
            return CenterDistanceSummary(advisory="No valid depth in center region.")
        median_depth = float(np.median(valid))
        return CenterDistanceSummary(
            distance_m=median_depth,
            confidence=0.8,
            advisory="Median relative depth (0-1 scale) derived from MiDaS center region.",
        )
