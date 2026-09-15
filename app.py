import os
import uuid
import threading
import io
from flask import Flask, request, jsonify, render_template, send_file
from utils.downloader import get_audio_from_url
from utils.transcriber import transcribe_audio, generate_srt, get_model
from utils.comments import get_top_comments
from fpdf import FPDF

# Set credentials from user
os.environ["IG_USERNAME"] = "tempmail4682"
os.environ["IG_PASSWORD"] = "temp$123"

app = Flask(__name__)

# Global results store
results = {}

# Preload whisper model in background to save time later
threading.Thread(target=get_model, daemon=True).start()

def process_reel(url, task_id):
    try:
        results[task_id] = {"status": "processing", "message": "Fetching audio stream..."}
        audio_np = get_audio_from_url(url)
        
        results[task_id] = {"status": "processing", "message": "Transcribing audio..."}
        transcription_data = transcribe_audio(audio_np)
        
        results[task_id] = {"status": "processing", "message": "Fetching comments..."}
        comments = get_top_comments(url)
        
        results[task_id] = {
            "status": "completed",
            "transcript": transcription_data["text"],
            "segments": transcription_data["segments"],
            "comments": comments
        }
    except Exception as e:
        results[task_id] = {
            "status": "error",
            "message": str(e)
        }

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
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
