from __future__ import annotations

import base64
import io
from typing import Optional

import speech_recognition as sr
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from pydub import AudioSegment


class ElevenLabsBridge:
    """Wraps ElevenLabs TTS plus the speech-recognition flow provided by the teammate."""

    def __init__(
        self,
        api_key: str,
        voice_id: str = "pNInz6obpgDQGcFmaJgB",
    ) -> None:
        self.client = ElevenLabs(api_key=api_key)
        self.voice_id = voice_id
        self._recognizer = sr.Recognizer()

    def synthesize(self, text: str) -> bytes:
        """Return MP3 bytes produced by ElevenLabs."""
        response = self.client.text_to_speech.convert(
            voice_id=self.voice_id,
            optimize_streaming_latency="0",
            output_format="mp3_22050_32",
            text=text,
            model_id="eleven_turbo_v2",
            voice_settings=VoiceSettings(
                stability=0.0,
                similarity_boost=1.0,
                style=0.0,
                use_speaker_boost=True,
            ),
        )
        audio_bytes = bytearray()
        for chunk in response:
            if chunk:
                audio_bytes.extend(chunk)
        return bytes(audio_bytes)

    def transcribe_base64_audio(self, audio_base64: str) -> Optional[str]:
        """
        Convert a base64-encoded audio file (wav/mp3/m4a) to text using the
        same Google SpeechRecognition flow the teammate set up.
        """
        try:
            raw = base64.b64decode(audio_base64)
        except (ValueError, TypeError) as exc:
            raise ValueError("audio_base64 is not valid base64") from exc

        audio_segment = AudioSegment.from_file(io.BytesIO(raw))
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_io.seek(0)

        with sr.AudioFile(wav_io) as source:
            audio_data = self._recognizer.record(source)
        try:
            transcript = self._recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            return None
        except sr.RequestError as exc:
            raise RuntimeError(f"Speech recognition service unavailable: {exc}") from exc
        return transcript.strip() or None
