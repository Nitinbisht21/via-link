import whisper
import datetime
import threading
import torch

# Model loaded lazily
_model = None
_model_lock = threading.Lock()

def get_model():
    global _model
    with _model_lock:
        if _model is None:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gpu_name = torch.cuda.get_device_name(0)
                print(f"Loading Whisper 'medium' model on GPU ({gpu_name})...")
                _model = whisper.load_model("medium", device="cuda")
            else:
                print("Loading Whisper 'medium' model on CPU...")
                _model = whisper.load_model("medium", device="cpu")
            print("Model loaded successfully.")
    return _model

def transcribe_audio(audio_np):
    model = get_model()
    # Transcribe the numpy array using FP16 to save VRAM on RTX 4050
    result = model.transcribe(audio_np, fp16=torch.cuda.is_available())
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
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
