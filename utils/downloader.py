import subprocess
import numpy as np
import yt_dlp
import imageio_ffmpeg
import os

def get_audio_from_url(url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'username': os.getenv("IG_USERNAME"),
        'password': os.getenv("IG_PASSWORD")
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        # Extract metadata to get the stream URL without downloading
        info = ydl.extract_info(url, download=False)
        stream_url = info['url']
        
    # Use bundled ffmpeg executable from imageio-ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        
    # We pipe the stream via ffmpeg into stdout (as s16le raw audio, mono, 16kHz)
    cmd = [
        ffmpeg_exe,
        '-i', stream_url,
        '-f', 's16le',
        '-ac', '1',
        '-ar', '16000',
        '-'
    ]
    
    # Run ffmpeg and capture stdout directly into RAM
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    audio_data, _ = process.communicate()
    
    # Convert byte string to numpy array and normalize to [-1.0, 1.0] for Whisper
    audio_np = np.frombuffer(audio_data, np.int16).astype(np.float32) / 32768.0
    return audio_np
