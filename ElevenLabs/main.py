from elevenlabs.client import ElevenLabs
import os
import speech_recognition as sr
from pydub import AudioSegment
from pydub.playback import play
from pydub.generators import Sine
import time
from config import ELEVENLABS_API_KEY
from SnowFlakeLLMClient import SnowflakeLLMClient

from dotenv import load_dotenv
from elevenlabs import VoiceSettings

load_dotenv()

if not ELEVENLABS_API_KEY:
    raise ValueError("ELEVENLABS_API_KEY environment variable not set")

client = ElevenLabs(
    api_key=ELEVENLABS_API_KEY,
)


def play_listening_beep():
    """
    Plays a short beep sound to indicate the system is listening.
    """
    try:
        beep = Sine(440).to_audio_segment(duration=200)
        play(beep)
    except Exception as e:
        print(f"Could not play beep: {e}")


def play_processing_beep():
    """
    Plays a double beep sound to indicate processing has started.
    """
    try:
        beep1 = Sine(440).to_audio_segment(duration=100)
        silence = AudioSegment.silent(duration=100)
        beep2 = Sine(520).to_audio_segment(duration=100)
        double_beep = beep1 + silence + beep2
        play(double_beep)
    except Exception as e:
        print(f"Could not play beep: {e}")


def text_to_speech_stream(text: str):
    """
    Converts text to speech and plays it using ElevenLabs.
    
    Args:
        text (str): The text to convert to speech and play.
    """
    try:
        print(f"🔊 Speaking: {text}")
        
        response = client.text_to_speech.convert(
            voice_id="CYw3kZ02Hs0563khs1Fj",
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

        script_dir = os.path.dirname(os.path.abspath(__file__))
        save_file_path = os.path.join(script_dir, "Audio.mp3")  # Absolute path

        with open(save_file_path, "wb") as f:
            for chunk in response:
                if chunk:
                    f.write(chunk)

        # Play the audio
        audio = AudioSegment.from_mp3(save_file_path)
        play(audio)
        print("✅ Audio playback completed.\n")
        
    except Exception as e:
        print(f"❌ Error in text-to-speech: {e}")


def speech_to_text() -> str:
    """
    Captures audio from the microphone and converts it to text.

    Returns:
        str: The transcribed text from the audio, or empty string if failed.
    """
    recognizer = sr.Recognizer()
    
    with sr.Microphone() as source:
        # Clear visual indication that listening has started
        print("\n" + "="*60)
        print("🎤 LISTENING NOW - Speak your message!")
        print("="*60)
        
        # Play audio beep to indicate listening
        play_listening_beep()
        
        recognizer.adjust_for_ambient_noise(source, duration=0.5)
        
        try:
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            
            # Play processing beep
            print("\n⏳ Processing your speech...")
            play_processing_beep()
            
            text = recognizer.recognize_google(audio)
            print(f"✅ You said: {text}\n")
            return text
            
        except sr.WaitTimeoutError:
            print("❌ No speech detected within timeout period.\n")
            return ""
        except sr.UnknownValueError:
            print("❌ Could not understand audio.\n")
            return ""
        except sr.RequestError as e:
            print(f"❌ Could not request results from speech recognition service; {e}\n")
            return ""


def conversation_loop():
    """
    Main conversation loop for the navigation assistant.
    Listens for user input, gets response from Snowflake LLM, and speaks it.
    """
    print("\n" + "="*60)
    print("🚀 Navigation Assistant Started!")
    print("="*60)
    print("💡 TIP: Listen for the beep sound - that's when you should speak!")
    print("💡 Say 'exit' or 'quit' to stop the program.")
    print("="*60 + "\n")
    
    # Initialize Snowflake LLM client
    llm_client = SnowflakeLLMClient()
    
    # Greeting
    text_to_speech_stream("Hello! I'm your navigation assistant. How can I help you today?")
    
    # Store conversation context
    conversation_history = []
    
    try:
        while True:
            # Small pause before listening again
            time.sleep(0.5)
            
            # Listen for user input
            user_speech = speech_to_text()
            
            if not user_speech:
                print("⏸️  Waiting for your next command...\n")
                continue
            
            # Check for exit commands
            if user_speech.lower() in ['exit', 'quit', 'stop', 'goodbye']:
                print("👋 Shutting down...")
                text_to_speech_stream("Goodbye! Stay safe.")
                break
            
            # Add user message to history
            conversation_history.append(f"User: {user_speech}")
            
            # Get response from Snowflake LLM
            print("🤖 Getting response from AI...")
            
            # Build context from recent conversation history (last 3 exchanges)
            context = "\n".join(conversation_history[-6:]) if conversation_history else ""
            
            llm_response = llm_client.get_contextual_response(
                user_message=user_speech,
                context=context
            )
            
            if llm_response:
                # Add assistant response to history
                conversation_history.append(f"Assistant: {llm_response}")
                
                # Speak the response (removed console print of response)
                text_to_speech_stream(llm_response)
            else:
                # Fallback response if LLM fails
                fallback = "I'm sorry, I'm having trouble processing that right now. Could you try again?"
                text_to_speech_stream(fallback)
                
    except KeyboardInterrupt:
        print("\n\n👋 Program interrupted by user")
    finally:
        # Clean up
        llm_client.close()
        print("✅ Navigation assistant closed")


if __name__ == "__main__":
    conversation_loop()