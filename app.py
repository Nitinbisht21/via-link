import os
import uuid
import threading
import io
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, request, jsonify, render_template, send_file
from utils.downloader import get_audio_from_url
from utils.transcriber import transcribe_audio, generate_srt, get_model
from utils.comments import get_top_comments
from utils.hashtag import get_top_reels_by_hashtag
from fpdf import FPDF


app = Flask(__name__)

# Global results store
results = {}

# Preload whisper model in background to save time later
threading.Thread(target=get_model, daemon=True).start()

def process_reel(url, task_id):
    transcript = ""
    segments = []
    comments = []
    error_msgs = []
    
    # 1. Audio & Transcription
    try:
        results[task_id] = {"status": "processing", "message": "Fetching audio stream..."}
        print(f"[{task_id[:8]}] Fetching audio stream...")
        audio_np = get_audio_from_url(url)
        
        results[task_id] = {"status": "processing", "message": "Transcribing audio on GPU..."}
        print(f"[{task_id[:8]}] Transcribing audio with Whisper...")
        transcription_data = transcribe_audio(audio_np)
        transcript = transcription_data.get("text", "").strip()
        segments = transcription_data.get("segments", [])
        print(f"[{task_id[:8]}] Transcription finished ({len(transcript)} chars).")
    except Exception as e:
        print(f"[{task_id[:8]}] Audio/Transcription error: {e}")
        error_msgs.append(f"Transcription error: {e}")
        
    # 2. Comments
    try:
        results[task_id] = {"status": "processing", "message": "Fetching comments..."}
        print(f"[{task_id[:8]}] Fetching comments...")
        comments = get_top_comments(url)
        print(f"[{task_id[:8]}] Comment fetching finished ({len(comments)} comments).")
    except Exception as e:
        print(f"[{task_id[:8]}] Comments error: {e}")
        comments = [f"⚠️ Error fetching comments: {e}"]

    if not transcript and not comments and error_msgs:
        results[task_id] = {
            "status": "error",
            "message": " | ".join(error_msgs)
        }
    else:
        results[task_id] = {
            "status": "completed",
            "transcript": transcript or "No speech detected in audio.",
            "segments": segments,
            "comments": comments
        }

def process_hashtag(tag, task_id, limit=50):
    try:
        results[task_id] = {"status": "processing", "message": f"Exploring Instagram #{tag}..."}
        print(f"[{task_id[:8]}] Scraping top reels for hashtag #{tag}...")
        data = get_top_reels_by_hashtag(tag, limit=limit)
        results[task_id] = data
        print(f"[{task_id[:8]}] Hashtag scraping finished: {data.get('status')}")
    except Exception as e:
        print(f"[{task_id[:8]}] Hashtag error: {e}")
        results[task_id] = {"status": "error", "message": str(e)}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process():
    data = request.get_json()
    url = data.get("url")
    if not url:
        return jsonify({"error": "URL is required"}), 400
        
    task_id = str(uuid.uuid4())
    results[task_id] = {"status": "queued"}
    
    thread = threading.Thread(
        target=process_reel,
        args=(url, task_id)
    )
    thread.start()
    
    return jsonify({"task_id": task_id})

@app.route("/hashtag", methods=["POST"])
def hashtag():
    data = request.get_json() or {}
    tag = data.get("tag", "").strip()
    if not tag:
        return jsonify({"error": "Hashtag is required"}), 400
        
    limit = int(data.get("limit", 50))
    task_id = str(uuid.uuid4())
    results[task_id] = {"status": "queued", "message": f"Queued exploration for #{tag}..."}
    
    thread = threading.Thread(
        target=process_hashtag,
        args=(tag, task_id, limit)
    )
    thread.start()
    
    return jsonify({"task_id": task_id})


@app.route("/result/<task_id>")
def get_result(task_id):
    res = results.get(task_id)
    if not res:
        return jsonify({"status": "error", "message": "Task not found"}), 404
    return jsonify(res)

@app.route("/download/<task_id>/<format>")
def download_transcript(task_id, format):
    res = results.get(task_id)
    if not res or res.get("status") != "completed":
        return "Task not found or not completed", 404
        
    transcript = res.get("transcript", "")
    
    if format == "txt":
        mem = io.BytesIO()
        mem.write(transcript.encode('utf-8'))
        mem.seek(0)
        return send_file(mem, as_attachment=True, download_name="transcript.txt", mimetype="text/plain")
        
    elif format == "srt":
        srt_content = generate_srt(res.get("segments", []))
        mem = io.BytesIO()
        mem.write(srt_content.encode('utf-8'))
        mem.seek(0)
        return send_file(mem, as_attachment=True, download_name="transcript.srt", mimetype="text/plain")
        
    elif format == "pdf":
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("helvetica", size=12)
        safe_transcript = transcript.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 10, text=safe_transcript)
        
        mem = io.BytesIO(bytes(pdf.output()))
        mem.seek(0)
        return send_file(mem, as_attachment=True, download_name="transcript.pdf", mimetype="application/pdf")
        
    return "Invalid format", 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
