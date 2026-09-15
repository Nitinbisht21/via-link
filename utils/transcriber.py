import whisper
import datetime
import threading

# Model loaded lazily
_model = None
_model_lock = threading.Lock()

def get_model():
    global _model
    with _model_lock:
        if _model is None:
            # Load whisper large model
            print("Loading Whisper 'large' model...")
            _model = whisper.load_model("large")
            print("Model loaded successfully.")
    return _model

def transcribe_audio(audio_np):
    model = get_model()
    # Transcribe the numpy array using FP16 to save VRAM on RTX 4050
    result = model.transcribe(audio_np, fp16=True)
    
    return {
        "text": result["text"].strip(),
        "segments": result["segments"]
    }

def generate_srt(segments):
    srt_content = []
    for i, segment in enumerate(segments, start=1):
        start_time = datetime.timedelta(seconds=segment['start'])
        end_time = datetime.timedelta(seconds=segment['end'])
        
        # Format times to HH:MM:SS,mmm
        start_str = str(start_time)
        if '.' in start_str:
            start_str = start_str[:-3].replace('.', ',')
        else:
            start_str += ",000"
            
        end_str = str(end_time)
        if '.' in end_str:
            end_str = end_str[:-3].replace('.', ',')
        else:
            end_str += ",000"
            
        srt_content.append(f"{i}\n0{start_str} --> 0{end_str}\n{segment['text'].strip()}\n")
    return "\n".join(srt_content)
