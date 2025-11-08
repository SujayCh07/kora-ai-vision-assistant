"""Probe local video devices and print a simple quality score.

Run this to discover which device index corresponds to your laptop's built-in
camera (and to avoid virtual cameras like Iriun). It tries common OpenCV
backends and measures a brightness+contrast score over a few frames.

Usage:
    source .venv/bin/activate
    python vision/list_cameras.py

Or to increase the range of indexes tested:
    python vision/list_cameras.py --max 8
"""

from __future__ import annotations

import argparse
import time
from statistics import mean
import cv2


def score_frame(frame) -> float:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(gray.mean()) + float(gray.std())


def try_device(idx: int, backend=None, tries=5) -> float:
    try:
        if backend is None:
            cap = cv2.VideoCapture(idx)
        else:
            cap = cv2.VideoCapture(idx, backend)
        if not cap.isOpened():
            return -1.0
        scores = []
        # warm up
        for _ in range(tries):
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.05)
                continue
            scores.append(score_frame(frame))
            time.sleep(0.02)
        cap.release()
        if not scores:
            return -1.0
        return mean(scores)
    except Exception:
        return -1.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=6, help="Max device index to probe")
    args = parser.parse_args()

    backends = [None]
    if hasattr(cv2, "CAP_AVFOUNDATION"):
        backends.append(cv2.CAP_AVFOUNDATION)
    if hasattr(cv2, "CAP_ANY"):
        backends.append(cv2.CAP_ANY)

    print("Probing camera devices 0..{}".format(args.max))
    results = []
    for idx in range(0, args.max + 1):
        for b in backends:
            score = try_device(idx, backend=b, tries=5)
            results.append((idx, b, score))
            print(f"idx={idx:02d} backend={b} score={score:.2f}")

    # print summary sorted by score descending
    print("\nSummary (best first):")
    for idx, b, s in sorted(results, key=lambda x: x[2], reverse=True):
        print(f"idx={idx:02d} backend={b} score={s:.2f}")


if __name__ == '__main__':
    main()
