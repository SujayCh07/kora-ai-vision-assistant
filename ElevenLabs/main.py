from elevenlabs.client import ElevenLabs
import os
import uuid
import speech_recognition as sr
from pydub import AudioSegment
from pydub.playback import play
import time
from config import ELEVENLABS_API_KEY
import threading

from dotenv import load_dotenv
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

load_dotenv()

if not ELEVENLABS_API_KEY:
    raise ValueError("ELEVENLABS_API_KEY environment variable not set")

client = ElevenLabs(
    api_key=ELEVENLABS_API_KEY,
)


def text_to_speech_file(text: str, play_audio: bool = True) -> str:
    response = client.text_to_speech.convert(
        voice_id="pNInz6obpgDQGcFmaJgB",
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

    save_file_path = f"Audio.mp3"

    with open(save_file_path, "wb") as f:
        for chunk in response:
            if chunk:
                f.write(chunk)

    print(f"A new audio file was saved successfully at {save_file_path}")

    if play_audio:
        play_audio_file(save_file_path)

    return save_file_path


def play_audio_file(file_path: str):
    """
    Plays an audio file using pydub.

    Args:
        file_path (str): Path to the audio file to play.
    """
    try:
        audio = AudioSegment.from_mp3(file_path)
        print(f"Playing audio from {file_path}...")
        play(audio)
        print("Audio playback completed.")
    except Exception as e:
        print(f"Error playing audio: {e}")


def speech_to_text() -> str:
    """
    Captures audio from the microphone and converts it to text.

    Returns:
        str: The transcribed text from the audio, or empty string if failed.
    """
    recognizer = sr.Recognizer()
    
    with sr.Microphone() as source:
        print("Listening... Speak now!")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        
        try:
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            print("Processing speech...")
            
            text = recognizer.recognize_google(audio)
            print(f"You said: {text}")
            return text
            
        except sr.WaitTimeoutError:
            print("No speech detected within timeout period.")
            return ""
        except sr.UnknownValueError:
            print("Could not understand audio.")
            return ""
        except sr.RequestError as e:
            print(f"Could not request results from speech recognition service; {e}")
            return ""


def send_to_backend(user_speech: str):
    """
    Placeholder function to send user speech to backend server.
    
    Args:
        user_speech (str): The user's transcribed speech to send to backend.
    """
    # TODO: Implement API call to backend server
    print(f"[BACKEND] Sending to server: {user_speech}")
    pass


def check_backend_for_updates():
    """
    Placeholder function to check backend for new messages/responses.
    
    Returns:
        str: Response from backend, or None if no updates.
    """
    # TODO: Implement API call to check for backend updates
    # This will be replaced with WebSocket or proper polling logic
    return None


def conversation_loop():
    """
    Main conversation loop for the navigation assistant.
    Listens for user input, sends to backend, and speaks responses.
    """
    print("Navigation Assistant Started!")
    print("Say 'exit' or 'quit' to stop the program.\n")
    
    text_to_speech_file("Hello! I'm your navigation assistant. How can I help you today?")
    
    while True:
        # Listen for user input
        user_speech = speech_to_text()
        
        if not user_speech:
            continue
        
        # Store user speech in variable
        print(f"\n[USER SPEECH CAPTURED]: {user_speech}")
        
        # Check for exit commands
        if user_speech.lower() in ['exit', 'quit', 'stop', 'goodbye']:
            text_to_speech_file("Goodbye! Stay safe.")
            break
        
        # Send to backend server
        send_to_backend(user_speech)
        
        # For now, simulate backend response
        # TODO: Replace with actual backend polling/WebSocket
        response = f"I heard you say: {user_speech}. Processing your request."
        text_to_speech_file(response)


if __name__ == "__main__":
    conversation_loop()