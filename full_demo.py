from __future__ import annotations

import argparse
import asyncio
import base64
import io
import queue
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pygame
import speech_recognition as sr
from pydub import AudioSegment
from pydub.generators import Sine
from pydub.playback import play
from pydub.generators import Sine

PROJECT_ROOT = Path(__file__).resolve().parent
VISION_DIR = PROJECT_ROOT / "vision"

if str(VISION_DIR) not in sys.path:
    sys.path.append(str(VISION_DIR))

from config import get_settings
from ElevenLabs.main import get_assistant
from vision.integrations.snowflake_client import SnowflakeLLM
from vision.pipeline import VisionPipeline
from vision.schemas import Environment, FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata, Quadrant

WINDOW_VISION = "Assistive Overlay"
WINDOW_YOLO = "YOLO Detections"
WINDOW_DEPTH = "MiDaS Depth"

INACTIVITY_TIMEOUT = 45.0  # seconds of silence before ending the convo
PROXIMITY_THRESHOLD = 0.11  # meters - play alert if object is closer than this


class ProximityAlert:
    """Handles proximity alert sounds."""
    
    def __init__(self):
        """Initialize pygame mixer for playing alert sounds."""
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        self._alert_sound = None
        self._last_alert_time = 0.0
        self._alert_cooldown = 2.0  # seconds between alerts to avoid spam
        
    def create_alert_sound(self):
        """Create a simple beep sound programmatically."""
        sample_rate = 22050
        duration = 0.3  # seconds
        frequency = 800  # Hz
        
        # Generate a sine wave beep
        samples = int(sample_rate * duration)
        wave = np.sin(2 * np.pi * frequency * np.linspace(0, duration, samples))
        
        # Apply envelope to avoid clicks
        envelope = np.ones(samples)
        fade_samples = int(sample_rate * 0.05)
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
        wave = wave * envelope
        
        # Convert to 16-bit PCM
        wave = (wave * 32767).astype(np.int16)
        
        # Create stereo sound
        stereo_wave = np.column_stack((wave, wave))
        
        # Create pygame Sound object
        sound = pygame.sndarray.make_sound(stereo_wave)
        return sound
    
    def initialize(self):
        """Initialize the alert sound."""
        try:
            self._alert_sound = self.create_alert_sound()
            print("[ALERT] Proximity alert system initialized")
        except Exception as exc:
            print(f"[ALERT] Warning: Could not initialize alert sound: {exc}")
    
    def check_and_alert(self, response: FrameAnalysisResponse) -> bool:
        """
        Check if any objects are within proximity threshold and play alert.
        
        Returns:
            True if alert was played, False otherwise
        """
        if self._alert_sound is None:
            return False
        
        now = time.time()
        
        # Check cooldown
        if now - self._last_alert_time < self._alert_cooldown:
            return False
        
        # Find closest object
        closest_distance = float('inf')
        closest_object = None
        
        for obj in response.objects:
            if obj.relative_depth_m is not None and obj.relative_depth_m < closest_distance:
                closest_distance = obj.relative_depth_m
                closest_object = obj
        
        # Trigger alert if within threshold
        if closest_distance <= PROXIMITY_THRESHOLD:
            try:
                self._alert_sound.play()
                self._last_alert_time = now
                print(f"[ALERT] ⚠️  {closest_object.label} detected at {closest_distance:.2f}m!")
                return True
            except Exception as exc:
                print(f"[ALERT] Error playing sound: {exc}")
        
        return False


class SpeechListener:
    """Continuously captures phrases and stores them as base64 wav strings."""

    def __init__(
        self,
        recognizer: sr.Recognizer,
        microphone: sr.Microphone,
        *,
        phrase_time_limit: float,
    ) -> None:
        self._queue: "queue.Queue[str]" = queue.Queue()
        self._is_paused = False
        self._stopper = recognizer.listen_in_background(
            microphone,
            self._callback,
            phrase_time_limit=phrase_time_limit,
        )

    def _callback(self, recognizer: sr.Recognizer, audio: sr.AudioData) -> None:  # pylint: disable=unused-argument
        try:
            # Don't capture audio if paused (e.g., during TTS playback)
            if self._is_paused:
                print("[VOICE] Skipping audio capture (paused during playback)")
                return
                
            wav_bytes = audio.get_wav_data()
            audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
            self._queue.put(audio_b64)
            print(f"\n[VOICE] Captured user speech chunk ({len(wav_bytes)} bytes).")
            # Don't beep here - we'll control beeps from the main loop
        except Exception as exc:  # pragma: no cover
            print(f"[VOICE] Error capturing audio: {exc}")

    def pause(self) -> None:
        """Pause audio capture (e.g., during TTS playback)"""
        self._is_paused = True
        print("[VOICE] Microphone paused")

    def resume(self) -> None:
        """Resume audio capture"""
        self._is_paused = False
        print("[VOICE] Microphone resumed")

    def get_audio(self) -> Optional[str]:
        try:
            return self._queue.get_nowait()
        except queue.Empty:
            return None

    def stop(self) -> None:
        if self._stopper:
            self._stopper(wait_for_stop=False)


class ProximityBeepController:
    """Background beeper that speeds up as obstacles get closer."""

    def __init__(
        self,
        *,
        closeness_threshold: float = 0.15,
        center_trigger_threshold: float = 0.90,
        min_interval: float = 0.15,
        max_interval: float = 1.5,
        beep_frequency: float = 880.0,
        beep_duration_ms: int = 90,
    ) -> None:
        self.closeness_threshold = closeness_threshold
        self.center_trigger_threshold = center_trigger_threshold
        self.min_interval = min_interval
        self.max_interval = max_interval
        self._object_distance: Optional[float] = None
        self._center_distance: Optional[float] = None
        self._lock = threading.Lock()
        self._running = True
        self._beep_audio = Sine(beep_frequency).to_audio_segment(duration=beep_duration_ms).apply_gain(-6)
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def update(self, object_distance: Optional[float], center_object_distance: Optional[float]) -> None:
        with self._lock:
            self._object_distance = object_distance
            self._center_distance = center_object_distance

    def stop(self) -> None:
        self._running = False
        self._thread.join(timeout=1.0)

    def _loop(self) -> None:
        last_play = 0.0
        while self._running:
            with self._lock:
                object_distance = self._object_distance
                center_distance = self._center_distance

            effective_distance: Optional[float] = None
            if center_distance is not None and center_distance > self.center_trigger_threshold:
                effective_distance = 0.0  # force immediate beeps when straight ahead is very close
            elif object_distance is not None:
                effective_distance = object_distance

            if effective_distance is None:
                time.sleep(0.1)
                continue

            clamped = max(0.0, min(effective_distance, 1.0))
            closeness = 1.0 - clamped  # 1.0 => very close, 0 => far
            if closeness < self.closeness_threshold:
                time.sleep(0.1)
                continue

            interval = self.max_interval - closeness * (self.max_interval - self.min_interval)
            interval = max(self.min_interval, min(self.max_interval, interval))
            now = time.time()
            if now - last_play >= interval:
                try:
                    play(self._beep_audio)
                except Exception as exc:  # pragma: no cover
                    print(f"[BEEP] Failed to play proximity beep: {exc}")
                last_play = now
            time.sleep(0.04)


def frame_to_base64(frame: np.ndarray) -> str:
    success, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not success:
        raise RuntimeError("Failed to encode frame as JPEG")
    return base64.b64encode(encoded.tobytes()).decode("utf-8")


def draw_yolo_view(frame: np.ndarray, response: FrameAnalysisResponse) -> np.ndarray:
    view = frame.copy()
    h, w = view.shape[:2]
    for obj in response.objects:
        x_min = int(obj.bounding_box.x_min * w)
        y_min = int(obj.bounding_box.y_min * h)
        x_max = int(obj.bounding_box.x_max * w)
        y_max = int(obj.bounding_box.y_max * h)
        
        # Use red color for proximity alerts
        color = (0, 0, 255) if (obj.relative_depth_m and obj.relative_depth_m <= PROXIMITY_THRESHOLD) else (0, 255, 0)
        cv2.rectangle(view, (x_min, y_min), (x_max, y_max), color, 2, cv2.LINE_AA)
        
        label = f"{obj.label} ({obj.confidence:.2f})"
        cv2.putText(view, label, (x_min, max(18, y_min - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2, cv2.LINE_AA)
    cv2.putText(view, "YOLO detections", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    return view


def draw_overlay(frame: np.ndarray, response: FrameAnalysisResponse, environment: Environment, llm_text: Optional[str]) -> np.ndarray:
    annotated = frame.copy()
    h, w = annotated.shape[:2]
    grid_color = (80, 80, 80)
    for i in range(1, 3):
        cv2.line(annotated, (i * w // 3, 0), (i * w // 3, h), grid_color, 1, cv2.LINE_AA)
        cv2.line(annotated, (0, i * h // 3), (w, i * h // 3), grid_color, 1, cv2.LINE_AA)

    # Check for proximity alerts
    has_proximity_alert = any(
        obj.relative_depth_m and obj.relative_depth_m <= PROXIMITY_THRESHOLD 
        for obj in response.objects
    )

    for obj in response.objects:
        x_min = int(obj.bounding_box.x_min * w)
        y_min = int(obj.bounding_box.y_min * h)
        x_max = int(obj.bounding_box.x_max * w)
        y_max = int(obj.bounding_box.y_max * h)
        
        # Use red for proximity alerts, orange for center, green otherwise
        if obj.relative_depth_m and obj.relative_depth_m <= PROXIMITY_THRESHOLD:
            color = (0, 0, 255)  # Red for close objects
        elif obj.quadrant.value == "center":
            color = (0, 200, 255)  # Orange for center
        else:
            color = (0, 200, 0)  # Green for normal
            
        cv2.rectangle(annotated, (x_min, y_min), (x_max, y_max), color, 2, cv2.LINE_AA)
        depth_text = f"{obj.relative_depth_m:.2f}" if obj.relative_depth_m is not None else "n/a"
        cv2.putText(
            annotated,
            f"{obj.label} ({depth_text})",
            (x_min, max(18, y_min - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA,
        )

    center = response.center_distance
    center_text = (
        f"Center depth (0-1): {center.distance_m:.2f} conf={center.confidence or 0.0:.2f}"
        if center.distance_m is not None
        else "Center depth unavailable"
    )
    cv2.putText(annotated, center_text, (18, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(annotated, f"Mode: {environment.value}", (18, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 255, 180), 2, cv2.LINE_AA)

    # Show status
    status_color = (0, 255, 255) if "PROCESSING" in status else (0, 255, 0)
    cv2.putText(annotated, status, (18, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2, cv2.LINE_AA)
    
    # Show proximity warning
    if has_proximity_alert:
        warning_text = f"⚠️  PROXIMITY ALERT - Object within {PROXIMITY_THRESHOLD}m"
        cv2.putText(annotated, warning_text, (18, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)

    if llm_text:
        y = h - 90
        for line in wrap_text(llm_text, width=52):
            cv2.putText(annotated, line, (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 0), 2, cv2.LINE_AA)
            y += 22

    cv2.putText(
        annotated,
        "Say 'Hey Kora' to ask questions. Press Q/Esc to quit.",
        (18, h - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (200, 200, 200),
        2,
        cv2.LINE_AA,
    )
    return annotated


def render_depth(depth_map: Optional[np.ndarray], shape: tuple[int, int]) -> np.ndarray:
    height, width = shape
    if depth_map is None:
        blank = np.zeros((height, width, 3), dtype=np.uint8)
        cv2.putText(blank, "Depth unavailable", (40, height // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2, cv2.LINE_AA)
        return blank
    normalized = np.clip(depth_map, 0.0, 1.0)
    depth_uint8 = (normalized * 255).astype(np.uint8)
    depth_color = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_TURBO)
    depth_color = cv2.resize(depth_color, (width, height))
    cv2.putText(depth_color, "MiDaS depth (0-1)", (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
    return depth_color


def wrap_text(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        test = word if not current else f"{' '.join(current)} {word}"
        if len(test) > width:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines


def build_assistive_prompt(instructions: Optional[str], vision_summary: str, user_text: Optional[str] = None) -> str:
    """Build prompt for assistive navigation with or without user question."""
    system = (instructions or DEFAULT_PROMPT).strip()
    
    if user_text:
        # User asked a specific question
        return (
            f"{system}\n\n"
            f"Vision context:\n{vision_summary}\n\n"
            f"User question:\n{user_text}\n\n"
            "Respond conversationally to answer their question based on what you see."
        )
    else:
        # Automatic assistive description
        return (
            f"{system}\n\n"
            f"Vision context:\n{vision_summary}\n\n"
            "Provide a brief, helpful description of the scene focusing on:\n"
            "1. Key objects in the environment and their locations\n"
            "2. Potential obstacles or hazards\n"
            "3. Navigation guidance if needed\n"
            "Keep it concise (2-3 sentences) and conversational."
        )


class PersistentLLMConnection:
    """Manages a persistent connection to Snowflake LLM to avoid reconnecting each time."""
    
    def __init__(self, snowflake_client: SnowflakeLLM):
        self.client = snowflake_client
        self._connection_active = False
        
    def __enter__(self):
        """Establish persistent connection."""
        try:
            # Keep the Snowflake connection alive
            self._connection_active = True
            print("[LLM] Persistent connection established")
        except Exception as e:
            print(f"[LLM] Error establishing persistent connection: {e}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close persistent connection."""
        try:
            self._connection_active = False
            print("[LLM] Persistent connection closed")
        except Exception as e:
            print(f"[LLM] Error closing persistent connection: {e}")
    
    def complete(self, prompt: str) -> str:
        """Send completion request using persistent connection."""
        if not self._connection_active:
            print("[LLM] Warning: Connection not active, using regular method")
        return self.client.complete(prompt)


class PersistentElevenLabsConnection:
    """Manages persistent connection to ElevenLabs to avoid reconnecting each time."""
    
    def __init__(self, eleven_client: ElevenLabsBridge):
        self.client = eleven_client
        self._connection_active = False
        
        # Describe each quadrant
        for quadrant, objects in by_quadrant.items():
            obj_descriptions = []
            for obj in objects:
                depth_str = f"{obj.relative_depth_m:.1f} meters away" if obj.relative_depth_m else "unknown distance"
                # Add proximity warning to description
                if obj.relative_depth_m and obj.relative_depth_m <= PROXIMITY_THRESHOLD:
                    depth_str += " ⚠️ VERY CLOSE"
                obj_descriptions.append(f"{obj.label} ({depth_str})")
            
            parts.append(f"- In the {quadrant.replace('_', ' ')}: {', '.join(obj_descriptions)}")
    else:
        parts.append("I don't see any specific objects detected in the current view.")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close persistent connection."""
        try:
            self._connection_active = False
            print("[ELEVENLABS] Persistent connection closed")
        except Exception as e:
            print(f"[ELEVENLABS] Error closing persistent connection: {e}")
    
    def transcribe_base64_audio(self, audio_base64: str) -> Optional[str]:
        """Transcribe audio using persistent connection."""
        if not self._connection_active:
            print("[ELEVENLABS] Warning: Connection not active, using regular method")
        return self.client.transcribe_base64_audio(audio_base64)
    
    def synthesize(self, text: str) -> bytes:
        """Synthesize speech using persistent connection."""
        if not self._connection_active:
            print("[ELEVENLABS] Warning: Connection not active, using regular method")
        return self.client.synthesize(text)


def play_audio_bytes(audio_bytes: bytes) -> None:
    """Play audio from bytes with multiple fallback methods."""
    try:
        print(f"[AUDIO] Received {len(audio_bytes)} bytes of audio data")
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="mp3")
        print(f"[AUDIO] Audio duration: {len(audio_segment)}ms")
        print("[AUDIO] Playing audio now...")
        
        # Method 1: Try pydub's play() function
        try:
            play(audio_segment)
            print("[AUDIO] Audio playback completed via pydub")
            return
        except Exception as e1:
            print(f"[AUDIO] pydub play failed: {e1}")
            
            # Method 2: Try saving to temp file and playing with pygame/windows
            try:
                import tempfile
                import os
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name
                
                # Try using Windows' built-in player
                os.system(f'start /min "" "{tmp_path}"')
                time.sleep(len(audio_segment) / 1000.0 + 0.5)  # Wait for audio to finish
                os.unlink(tmp_path)
                print("[AUDIO] Audio playback completed via Windows player")
                return
            except Exception as e2:
                print(f"[AUDIO] Windows player failed: {e2}")
                
                    
    except Exception as e:
        print(f"[AUDIO] Error in play_audio_bytes: {e}")
        import traceback
        traceback.print_exc()


def run_cycle(
    frame: np.ndarray,
    metadata: FrameMetadata,
    environment: Environment,
    prompt_instructions: Optional[str],
    audio_base64: Optional[str],
    transcript_text: Optional[str],
    pipeline: VisionPipeline,
    eleven_conn: PersistentElevenLabsConnection,
    snowflake_conn: PersistentLLMConnection,
    synthesize_voice: bool,
    proximity_alert: ProximityAlert,
) -> FrameAnalysisResponse:
    #print("\n" + "="*80)
    #print("[CYCLE] START")
    #print("="*80)
    
    # Vision processing
    request = FrameAnalysisRequest(
        frame_id=f"demo-{int(time.time() * 1000)}",
        timestamp=datetime.utcnow(),
        frame_metadata=metadata,
        image_base64=frame_to_base64(frame),
        environment=environment,
        audio_base64=audio_base64,
        prompt_instructions=prompt_instructions,
        synthesize_voice=synthesize_voice,
    )
    print("[PIPELINE] Running vision pipeline...")
    response = pipeline.process(request)
    #print(f"[1/5] ✓ Found {len(response.objects)} objects")
    
    # Check for proximity alerts
    proximity_alert.check_and_alert(response)
    
    # Log what we detected
    for obj in response.objects:
        depth_str = f"{obj.relative_depth_m:.1f}m" if obj.relative_depth_m else "n/a"
        #print(f"      - {obj.label} @ {obj.quadrant.value} ({depth_str})")

    update: dict[str, Optional[str]] = {}
    user_transcript = None
    audio_was_played = False
    
    # Handle user speech if present
    if audio_base64:
        print("[AUDIO] Transcribing captured speech via ElevenLabs workflow...")
        try:
            transcript = eleven_conn.transcribe_base64_audio(audio_base64)
            update["user_transcript"] = transcript
            user_transcript = transcript
            if transcript:
                print(f"[AUDIO] Transcript: {transcript}")
        except Exception as e:
            print(f"[AUDIO] Transcription error: {e}")
            update["user_transcript"] = None
    
    # Generate LLM response - either for user question or automatic narration
    if always_narrate or user_transcript:
        prompt = build_assistive_prompt(
            prompt_instructions, 
            response.vision_summary, 
            user_transcript
        )
        print("[LLM] Sending prompt to Snowflake Cortex (persistent connection)...")
        try:
            llm_text = snowflake_conn.complete(prompt)
            print("[LLM] Received response.")
            print(f"[LLM] Response: {llm_text}")
            update["llm_response"] = llm_text
            
            # ALWAYS synthesize and play audio for LLM responses
            if llm_text and synthesize_voice:
                print("[TTS] Synthesizing ElevenLabs audio (persistent connection)...")
                try:
                    audio_bytes = eleven_conn.synthesize(llm_text)
                    print(f"[TTS] Synthesis successful, got {len(audio_bytes)} bytes")
                    update["audio_response_base64"] = base64.b64encode(audio_bytes).decode("utf-8")
                    
                    # Pause microphone during playback
                    if listener:
                        listener.pause()
                    
                    print("[TTS] Playing audio response...")
                    play_audio_bytes(audio_bytes)
                    print("[TTS] Audio playback complete")
                    audio_was_played = True
                    
                    # Resume microphone after playback
                    if listener:
                        listener.resume()
                        
                except Exception as e:
                    print(f"[TTS] Error synthesizing/playing audio: {e}")
                    # Make sure to resume even if there's an error
                    if listener:
                        listener.resume()
                    import traceback
                    traceback.print_exc()
        except Exception as e:
            print(f"[LLM] Error: {e}")
            update["llm_response"] = None
    
    if update:
        response = response.model_copy(update=update)
    return response, audio_was_played


def log_packages(response: FrameAnalysisResponse) -> None:
    print("\n" + "=" * 80)
    print(f"Frame: {response.frame_id}")
    for obj in response.objects:
        depth = f"{obj.relative_depth_m:.2f}" if obj.relative_depth_m is not None else "n/a"
        print(f"- {obj.label:<12} quadrant={obj.quadrant.value:<13} depth={depth:<6} conf={obj.confidence:.2f}")
    center = response.center_distance
    print("Center depth:", center.distance_m, "confidence:", center.confidence, "advisory:", center.advisory)
    if response.user_transcript:
        print("Transcript:", response.user_transcript)
    if response.llm_response:
        print("LLM response:", response.llm_response)


def main() -> None:
    parser = argparse.ArgumentParser(description="Full-stack assistive vision demo with audio feedback")
    parser.add_argument("--camera", type=int, default=0, help="Webcam index (default 0)")
    parser.add_argument(
        "--environment",
        choices=[Environment.INDOOR.value, Environment.OUTDOOR.value],
        default=Environment.INDOOR.value,
    )
    parser.add_argument("--interval", type=float, default=5.0, help="Seconds between automatic narration")
    parser.add_argument("--prompt", type=str, default=None, help="Optional custom system instructions")
    parser.add_argument("--voice", action="store_true", help="Enable voice synthesis")
    parser.add_argument("--listen-time", type=float, default=8.0, help="Max seconds per utterance")
    parser.add_argument("--no-alert", action="store_true", help="Disable proximity alert sounds")
    args = parser.parse_args()

    if not args.voice:
        print("[WARNING] Voice synthesis is disabled. Use --voice flag to enable audio output.")

    from config import ELEVENLABS_API_KEY 
    pipeline = VisionPipeline()
    eleven = ElevenLabsBridge(api_key="sk_f78639cb226795df18b498c6ce0834688ccc5df0ff92b776")

    # === CONFIGURATION ===
    ACCOUNT = "QOGVOOL-RYC76187"
    REGION = "us-east-1"
    USER = "ADITYAJHA"
    PASSWORD = "7D8Wt-%iT6dHh9,1!£$!Z9"
    MODEL = "claude-3-5-sonnet"

    snowflake = SnowflakeLLM(
        account=ACCOUNT,
        user=USER,
        password=PASSWORD,
        role="ACCOUNTADMIN",
        model=MODEL,
    )
    
    # Initialize proximity alert system
    proximity_alert = ProximityAlert()
    if not args.no_alert:
        proximity_alert.initialize()

    cap = cv2.VideoCapture(args.camera, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open webcam index {args.camera}")

    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    listener = SpeechListener(recognizer, microphone, phrase_time_limit=args.listen_time)
    listener.start()
    
    #print(f"\nVOICE: {'ENABLED' if args.voice else 'DISABLED'}")
    #print(f"PROXIMITY ALERT: {'ENABLED' if not args.no_alert else 'DISABLED'}")
    #print(f"Say wake phrase to start\n")

    environment = Environment(args.environment)
    cv2.namedWindow(WINDOW_VISION, cv2.WINDOW_NORMAL)
    cv2.namedWindow(WINDOW_YOLO, cv2.WINDOW_NORMAL)
    cv2.namedWindow(WINDOW_DEPTH, cv2.WINDOW_NORMAL)

    metadata: Optional[FrameMetadata] = None
    last_run = 0.0
    last_response: Optional[FrameAnalysisResponse] = None
    conversation_active = False
    last_user_activity = 0.0

    def transcript_contains(text: Optional[str], phrases: tuple[str, ...]) -> bool:
        if not text:
            return False
        normalized = text.lower()
        return any(phrase in normalized for phrase in phrases)

    # Use persistent connections for better performance
    with PersistentElevenLabsConnection(eleven) as eleven_conn, \
         PersistentLLMConnection(snowflake) as snowflake_conn:
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Failed to capture frame. Exiting.")
                    break

                if metadata is None:
                    height, width = frame.shape[:2]
                    metadata = FrameMetadata(width=width, height=height, focal_length_px=None)

                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break

                now = time.time()
                speech_audio = listener.get_audio()
                should_refresh = now - last_run >= args.interval

                transcript_for_wake: Optional[str] = None
                if speech_audio:
                    try:
                        transcript_for_wake = eleven_conn.transcribe_base64_audio(speech_audio) or ""
                        print(f"[VOICE] Transcript preview: {transcript_for_wake!r}")
                    except Exception as exc:
                        print(f"[VOICE] Transcript failed during wake detection: {exc}")
                        transcript_for_wake = ""

                # Wake phrase detection
                if not conversation_active:
                    if transcript_contains(transcript_for_wake, WAKE_PHRASES):
                        conversation_active = True
                        last_user_activity = now
                        print("[WAKE] Wake phrase detected. Listening for your question...")
                        play_start_recording_beep()  # Beep to indicate listening started
                        # Don't process this audio, wait for next speech
                        continue

                # Handle user questions during active conversation
                if conversation_active and speech_audio and transcript_for_wake:
                    last_user_activity = now
                    if transcript_contains(transcript_for_wake, GOODBYE_PHRASES):
                        print("[WAKE] Goodbye phrase detected, ending conversation.")
                        conversation_active = False
                        play_beep(frequency=600, duration_ms=150)  # Goodbye beep
                        continue
                    
                    try:
                        response = run_cycle(
                            frame=frame,
                            metadata=metadata,
                            environment=environment,
                            prompt_instructions=args.prompt,
                            audio_base64=speech_audio,
                            pipeline=pipeline,
                            assistant=assistant,
                            snowflake=snowflake,
                            synthesize_voice=args.voice,
                            proximity_alert=proximity_alert,
                        )
                        last_response = response
                        last_run = now
                        
                        if response.user_transcript:
                            last_user_activity = now
                            
                    except Exception as exc:
                        #print(f"ERROR in cycle: {exc}")
                        import traceback
                    finally:
                        status = "Active - listening"
                        listener.resume_acceptance()
                        #print("Ready for next input\n")
                    
            # Periodic vision refresh
            if now - last_run >= args.interval and metadata and not conversation_active:
                request = FrameAnalysisRequest(
                    frame_id=f"demo-{int(time.time() * 1000)}",
                    timestamp=datetime.utcnow(),
                    frame_metadata=metadata,
                    image_base64=frame_to_base64(frame),
                    environment=environment,
                    audio_base64=None,
                    prompt_instructions=args.prompt,
                    synthesize_voice=False,
                )
                response = pipeline.process(request)
                last_response = response
                last_run = now
                
                # Check for proximity alerts during periodic refresh too
                if not args.no_alert:
                    proximity_alert.check_and_alert(response)

            # Timeout
            if conversation_active and now - last_user_activity > INACTIVITY_TIMEOUT:
                #print(f"\nTimeout after {INACTIVITY_TIMEOUT}s\n")
                conversation_active = False
                assistant.reset_history()
                status = "Waiting for wake phrase..."

            # Update display
            if last_response is not None:
                annotated = draw_overlay(frame, last_response, environment, last_response.llm_response, status)
                yolo_view = draw_yolo_view(frame, last_response)
                depth_view = render_depth(pipeline.last_depth_map, frame.shape[:2])
                cv2.imshow(WINDOW_VISION, annotated)
                cv2.imshow(WINDOW_YOLO, yolo_view)
                cv2.imshow(WINDOW_DEPTH, depth_view)
                
    finally:
        cap.release()
        cv2.destroyAllWindows()
        listener.stop()
        pygame.mixer.quit()


if __name__ == "__main__":
    main()