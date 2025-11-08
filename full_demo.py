from __future__ import annotations

import argparse
import base64
import io
import queue
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import speech_recognition as sr
from pydub import AudioSegment
from pydub.playback import play
from pydub.generators import Sine

PROJECT_ROOT = Path(__file__).resolve().parent
VISION_DIR = PROJECT_ROOT / "vision"

if str(VISION_DIR) not in sys.path:
    sys.path.append(str(VISION_DIR))

from config import get_settings
from vision.integrations.elevenlabs_bridge import ElevenLabsBridge
from vision.integrations.snowflake_client import SnowflakeLLM
from vision.pipeline import VisionPipeline
from vision.schemas import Environment, FrameAnalysisRequest, FrameAnalysisResponse, FrameMetadata

WINDOW_VISION = "Assistive Overlay"
WINDOW_YOLO = "YOLO Detections"
WINDOW_DEPTH = "MiDaS Depth"

with open("mcp_prompt.txt", "r", encoding="utf-8") as file:
    text = file.read()

DEFAULT_PROMPT = (text)
WAKE_PHRASES = ("hey kora", "hey cora", "hey kory", "hey core")
GOODBYE_PHRASES = ("bye", "goodbye", "bye kora", "bye cora", "thank you kora")
INACTIVITY_TIMEOUT = 25.0  # seconds of silence before ending the convo


def play_beep(frequency: int = 800, duration_ms: int = 200) -> None:
    """Play a beep sound at specified frequency and duration."""
    try:
        beep = Sine(frequency).to_audio_segment(duration=duration_ms)
        play(beep)
    except Exception as e:
        print(f"[BEEP] Error playing beep: {e}")


def play_start_recording_beep() -> None:
    """Play ascending beep to indicate recording started."""
    try:
        beep1 = Sine(600).to_audio_segment(duration=100)
        beep2 = Sine(800).to_audio_segment(duration=100)
        combined = beep1 + beep2
        play(combined)
    except Exception as e:
        print(f"[BEEP] Error playing start beep: {e}")


def play_stop_recording_beep() -> None:
    """Play descending beep to indicate recording stopped."""
    try:
        beep1 = Sine(800).to_audio_segment(duration=100)
        beep2 = Sine(600).to_audio_segment(duration=100)
        combined = beep1 + beep2
        play(combined)
    except Exception as e:
        print(f"[BEEP] Error playing stop beep: {e}")


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
            # Play beep when speech capture is complete (only if not paused)
            if not self._is_paused:
                play_stop_recording_beep()
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
        cv2.rectangle(view, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2, cv2.LINE_AA)
        label = f"{obj.label} ({obj.confidence:.2f})"
        cv2.putText(view, label, (x_min, max(18, y_min - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2, cv2.LINE_AA)
    cv2.putText(view, "YOLO detections", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    return view


def draw_overlay(frame: np.ndarray, response: FrameAnalysisResponse, environment: Environment, llm_text: Optional[str]) -> np.ndarray:
    annotated = frame.copy()
    h, w = annotated.shape[:2]
    grid_color = (80, 80, 80)
    for i in range(1, 3):
        cv2.line(annotated, (i * w // 3, 0), (i * w // 3, h), grid_color, 1, cv2.LINE_AA)
        cv2.line(annotated, (0, i * h // 3), (w, i * h // 3), grid_color, 1, cv2.LINE_AA)

    for obj in response.objects:
        x_min = int(obj.bounding_box.x_min * w)
        y_min = int(obj.bounding_box.y_min * h)
        x_max = int(obj.bounding_box.x_max * w)
        y_max = int(obj.bounding_box.y_max * h)
        color = (0, 200, 255) if obj.quadrant.value == "center" else (0, 200, 0)
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
    pipeline: VisionPipeline,
    eleven: ElevenLabsBridge,
    snowflake: SnowflakeLLM,
    synthesize_voice: bool,
    always_narrate: bool = True,
    listener: Optional[SpeechListener] = None,
) -> FrameAnalysisResponse:
    print("[PIPELINE] Building request payload.")
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
    print("[PIPELINE] Vision results ready.")

    update: dict[str, Optional[str]] = {}
    user_transcript = None
    
    # Handle user speech if present
    if audio_base64:
        print("[AUDIO] Transcribing captured speech via ElevenLabs workflow...")
        try:
            transcript = eleven.transcribe_base64_audio(audio_base64)
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
        print("[LLM] Sending prompt to Snowflake Cortex...")
        try:
            llm_text = snowflake.complete(prompt)
            print("[LLM] Received response.")
            print(f"[LLM] Response: {llm_text}")
            update["llm_response"] = llm_text
            
            # ALWAYS synthesize and play audio for LLM responses
            if llm_text and synthesize_voice:
                print("[TTS] Synthesizing ElevenLabs audio...")
                try:
                    audio_bytes = eleven.synthesize(llm_text)
                    print(f"[TTS] Synthesis successful, got {len(audio_bytes)} bytes")
                    update["audio_response_base64"] = base64.b64encode(audio_bytes).decode("utf-8")
                    
                    # Pause microphone during playback
                    if listener:
                        listener.pause()
                    
                    print("[TTS] Playing audio response...")
                    play_audio_bytes(audio_bytes)
                    print("[TTS] Audio playback complete")
                    
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
    return response


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
    parser.add_argument("--voice", action="store_true", help="Enable voice synthesis (REQUIRED for audio output)")
    parser.add_argument("--listen-time", type=float, default=7.0, help="Max seconds per utterance")
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

    cap = cv2.VideoCapture(args.camera, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open webcam index {args.camera}")

    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    listener = SpeechListener(recognizer, microphone, phrase_time_limit=args.listen_time)
    print(f"[VOICE] Background listener ready (phrase limit {args.listen_time}s).")
    print("[VOICE] Say 'Hey Kora' to ask questions about your surroundings.")
    print("[VOICE] System will automatically describe your environment every few seconds.")

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
                    transcript_for_wake = eleven.transcribe_base64_audio(speech_audio) or ""
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
                
                # User asked a question - process it
                print("[STATE] Processing user question in conversation mode")
                response = run_cycle(
                    frame=frame,
                    metadata=metadata,
                    environment=environment,
                    prompt_instructions=args.prompt,
                    audio_base64=speech_audio,
                    pipeline=pipeline,
                    eleven=eleven,
                    snowflake=snowflake,
                    synthesize_voice=args.voice,
                    always_narrate=True,
                    listener=listener,
                )
                last_response = response
                last_run = now
                log_packages(response)

            # Automatic narration on interval (even without user speech)
            elif should_refresh and metadata is not None:
                print("[STATE] Running automatic assistive narration")
                response = run_cycle(
                    frame=frame,
                    metadata=metadata,
                    environment=environment,
                    prompt_instructions=args.prompt,
                    audio_base64=None,  # No user speech
                    pipeline=pipeline,
                    eleven=eleven,
                    snowflake=snowflake,
                    synthesize_voice=args.voice,
                    always_narrate=True,  # Always generate narration
                    listener=listener,
                )
                last_response = response
                last_run = now
                log_packages(response)
            else:
                print("[PIPELINE] Waiting for next interval or user speech...", end="\r")

            # Timeout inactive conversations
            if conversation_active and now - last_user_activity > INACTIVITY_TIMEOUT:
                print("\n[WAKE] Conversation timed out due to inactivity.")
                conversation_active = False

            # Display windows
            if last_response is not None:
                annotated = draw_overlay(frame, last_response, environment, last_response.llm_response)
                yolo_view = draw_yolo_view(frame, last_response)
                depth_view = render_depth(pipeline.last_depth_map, frame.shape[:2])
                cv2.imshow(WINDOW_VISION, annotated)
                cv2.imshow(WINDOW_YOLO, yolo_view)
                cv2.imshow(WINDOW_DEPTH, depth_view)
    finally:
        cap.release()
        cv2.destroyAllWindows()
        listener.stop()


if __name__ == "__main__":
    main()