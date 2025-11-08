# AI-ATL Blind Assistance

Computer-vision backend for blind navigation. It exposes FastAPI endpoints backed by MiDaS depth estimation plus two perception stacks:
- **Indoor/general mode** – YOLOv8 detects common obstacles, we annotate each with quadrants + relative depth.
- **Outdoor mode** – YOLOv8 focuses on street agents while classical vision detectors add crosswalk, pole, and curb cues for safer outdoor routing.

## Folder structure
- `vision/`
  - `schemas.py` – request/response models (`FrameAnalysisRequest`, `DetectedObject`, `CenterDistanceSummary`, etc.)
  - `pipeline.py` – MiDaS depth estimator, YOLO driver, and the indoor/outdoor detection logic
  - `main.py` – FastAPI entrypoint with `/health` and `/analyze`
  - `demo.py` – multi-window OpenCV demo that drives the real pipeline from a webcam feed
- `requirements.txt` – FastAPI stack + PyTorch, Ultralytics, OpenCV, numpy, timm

## Dependencies
Install the packages listed in `requirements.txt`. They pull in:
- `torch`, `torchvision`, `timm` for MiDaS depth
- `ultralytics` (YOLOv8) for object detection
- `opencv-python`, `numpy` for image handling
- FastAPI stack (`fastapi`, `uvicorn`, `pydantic`, `python-multipart`)

> **Heads up**: Torch wheels are large. Install the CUDA-specific wheels from https://pytorch.org/get-started/locally/ if you want GPU acceleration.

## Running the backend
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn vision.main:app --reload
```

### Request payload
Send a POST to `/analyze` with JSON like:
```json
{
  "frame_id": "sample-0001",
  "timestamp": "2025-11-08T18:00:00Z",
  "frame_metadata": {"width": 1280, "height": 720, "focal_length_px": 900},
  "image_base64": "<RGB frame encoded via base64>",
  "environment": "indoor"
}
```

- `environment` accepts `"indoor"` (default) or `"outdoor"` to toggle the perception stack.
- The response returns the **object package** (labels, confidences, normalized bounding boxes, quadrants, MiDaS depth values in the 0‑1 relative scale) and the **center-distance package** (median normalized depth in the center 3×3 region).
- Convert the normalized depths to meters in a downstream service if you have calibration data.

## Live demo
`vision/demo.py` captures webcam frames, encodes them to base64, feeds them through the live pipeline, logs the outbound packages, and visualizes three OpenCV windows (YOLO detections, MiDaS depth map, and the assistive overlay with quadrants + metrics).

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python vision/demo.py --camera 0 --environment outdoor
```

Use `--camera N` to pick a different webcam index and `--environment indoor|outdoor` to swap models. Close windows with `q` or `Esc`. The first run may pause while YOLO and MiDaS weights download.

## Next steps for production
1. **Depth calibration** – Learn a mapping from MiDaS’ 0‑1 outputs to metric distances using your camera intrinsics.
2. **Performance tuning** – Pick the right YOLO weights, export to TensorRT/ONNX, and run everything on a GPU for lower latency.
3. **Streaming glue** – Add a capture loop (or WebRTC bridge) that continuously POSTs frames, streams responses to the LLM/audio layer, and handles back-pressure.
4. **Observability** – Layer in structured logging, metrics, and error handling so dropped frames/model failures are surfaced quickly.
