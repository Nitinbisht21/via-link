# 🎬 ReelScribe | Instagram Reel Transcriber & Comment Analyzer

**ReelScribe** is an AI-powered web application that downloads Instagram Reels, transcribes speech using OpenAI's **Whisper** model on local NVIDIA GPUs via CUDA, and scrapes top comments with live engagement metrics (likes, replies, links, and creator badges).

---

## ✨ Key Features

- ⚡ **GPU-Accelerated Speech-to-Text:**
  - Powered by OpenAI's Whisper (`medium` model with FP16 precision).
  - Optimized for consumer GPUs (like NVIDIA GeForce RTX 4050 Laptop GPU / 6GB VRAM) with automatic VRAM caching management to prevent Out-Of-Memory (OOM) errors.
  - Automatic fallback to CPU if CUDA is unavailable.
- 💬 **Live Instagram Comment Scraping:**
  - Scrapes top-ranked comments directly from Instagram via authenticated Web GraphQL queries.
  - Bypasses anti-bot checkpoints using persistent session cookie authentication (`IG_SESSIONID`).
- ❤️ **Engagement Metrics:**
  - Extracts exact **like counts** (`❤️ X likes`) for every comment.
  - Displays **reply counts** (`💬 X replies`).
  - Shows creator **verified badges** (`✓`) and profile avatars.
- 🔗 **Link Extraction:**
  - Detects hyperlinks/URLs inside comments and highlights them with one-click pills and auto-linkified text.
- 📥 **Export Options:**
  - Download transcripts as plain text (`.TXT`), timestamped subtitles (`.SRT`), or formatted documents (`.PDF`).
- 🎨 **Modern Dark UI:**
  - Responsive glassmorphism interface built with Tailwind CSS, custom animations, and non-blocking polling architecture.

---

## 🛠️ Architecture & How It Works

```
┌─────────────────┐       POST /process (Reel URL)        ┌─────────────────┐
│                 │ ────────────────────────────────────> │                 │
│  Web Browser    │                                       │   Flask Server  │
│  (Tailwind UI)  │ <──────────────────────────────────── │    (app.py)     │
│                 │       Returns task_id (Async)         └────────┬────────┘
└────────┬────────┘                                                │
         │ Polling GET /result/<task_id>                           │ Spawns worker thread
         ▼                                                         ▼
┌─────────────────┐                                       ┌─────────────────┐
│ Render Results: │                                       │ Background Task │
│ • Transcript    │                                       └────────┬────────┘
│ • Likes & Badges│                                                │
│ • SRT/PDF/TXT   │                                 ┌──────────────┴──────────────┐
└─────────────────┘                                 ▼                             ▼
                                           ┌─────────────────┐           ┌─────────────────┐
                                           │  Audio Pipeline │           │ Comment Pipeline│
                                           │ (yt-dlp + ffmpeg│           │ (Instaloader +  │
                                           │  + GPU Whisper) │           │ Web GraphQL)    │
                                           └─────────────────┘           └─────────────────┘
```

1. **Submission:** User pastes an Instagram Reel URL on the web interface.
2. **Worker Thread:** A background worker is spawned with a unique `task_id`.
3. **Audio Extraction:** `yt-dlp` extracts the direct audio stream, resampled to 16kHz mono via FFmpeg in memory.
4. **Whisper Transcription:** Transcribes speech into text and segmented timestamp chunks on the GPU.
5. **Comment Scraping:** Queries Instagram's web GraphQL API using authenticated session cookies to extract top comments, like counts, and links.
6. **Async UI Updates:** The frontend polls `/result/<task_id>` every 2 seconds, displaying progress spinners and rendering cards immediately upon completion.

---

## 📋 Prerequisites

Before running ReelScribe, ensure you have installed:

1. **Python 3.10 or 3.11** (recommended: [Python 3.11](https://www.python.org/downloads/))
2. **FFmpeg** (required by Whisper and yt-dlp):
   - **Windows:** Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or install via winget:
     ```powershell
     winget install "Gyan.FFmpeg"
     ```
   - Verify FFmpeg is added to your system `PATH`:
     ```powershell
     ffmpeg -version
     ```
3. *(Optional for GPU acceleration)* **NVIDIA GPU with CUDA 12.x drivers**.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Nitinbisht21/via-link.git
cd via-link
```

### 2. Create and Activate a Virtual Environment
```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

#### Install Core Python Packages:
```powershell
pip install -r requirements.txt
```

#### Install PyTorch with CUDA Support (for NVIDIA GPU):
If you have an NVIDIA GPU (e.g. RTX 3050, 4050, 4060, etc.):
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

Verify GPU availability:
```powershell
python -c "import torch; print('CUDA Available:', torch.cuda.is_available(), '| Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

---

## 🔑 Instagram Authentication Configuration

Instagram requires authentication to scrape comments and bypass anti-bot challenges.

1. Copy the sample environment file:
   ```powershell
   copy .env.example .env
   ```
2. Open `.env` and configure your credentials:
   ```env
   IG_USERNAME=your_instagram_username
   IG_PASSWORD=your_instagram_password
   IG_SESSIONID=your_browser_session_id_here
   ```

### 💡 How to Get Your `IG_SESSIONID` from Browser:
1. Open your browser (Chrome, Edge, or Firefox) and log in to [instagram.com](https://www.instagram.com).
2. Press **F12** to open Developer Tools.
3. Go to the **Application** tab (in Chrome/Edge) or **Storage** tab (in Firefox).
4. Under the left sidebar, expand **Cookies** → select `https://www.instagram.com`.
5. Find the cookie named **`sessionid`**.
6. Double-click the **Value** column, copy the string (e.g. `33310750176%3A...`), and paste it as `IG_SESSIONID` in your `.env` file.

> **Note:** `.env` is included in `.gitignore` so your login cookies and credentials will never be committed to Git.

---

## 🖥️ Running the Application

1. Make sure your virtual environment is active:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
2. Start the Flask server:
   ```powershell
   python app.py
   ```
3. Open your browser and navigate to:
   ```text
   http://127.0.0.1:5000
   ```
4. Paste any public Instagram Reel URL (e.g. `https://www.instagram.com/reel/DaJ6mSot3Ls/`) and click **Generate**.

---

## 📁 Project Structure

```text
via-link/
├── app.py                   # Main Flask application and API routes
├── requirements.txt         # Python package dependencies
├── .env.example             # Example environment template
├── .gitignore               # Ignored files (venv, .env, sessions, etc.)
├── README.md                # Documentation and setup instructions
│
├── static/
│   ├── main.js              # Client polling, result rendering, and linkify logic
│   └── style.css            # Glassmorphism styling, animations, and comment cards
│
├── templates/
│   └── index.html           # Main frontend web page
│
└── utils/
    ├── __init__.py
    ├── downloader.py        # Audio stream extraction via yt-dlp & FFmpeg
    ├── transcriber.py       # Whisper GPU model loading, inference & SRT generator
    └── comments.py          # Instagram GraphQL comment parser (likes, links, replies)
```

---

## ❓ Troubleshooting

### 1. "CUDA out of memory" error
- **Cause:** Whisper `large` model requires ~10GB of VRAM and will exceed 6GB GPUs.
- **Fix:** ReelScribe uses the `medium` model configured with FP16 precision, fitting comfortably in ~3.5GB–4GB VRAM. If you have a GPU with ≤4GB VRAM, change `"medium"` to `"small"` or `"base"` in `utils/transcriber.py`.

### 2. "Login required" or 0 comments fetched
- **Cause:** Instagram flagged password-based login or your `sessionid` expired.
- **Fix:** Refresh your Instagram session in your browser, copy the latest `sessionid` cookie value, update `IG_SESSIONID` in `.env`, and restart `app.py`.

### 3. "FFmpeg not found"
- **Cause:** FFmpeg is not installed or not in your system `PATH`.
- **Fix:** Install FFmpeg and add its `bin` folder to your Environment Variables, then restart your terminal.

---

## 📄 License

This project is licensed under the MIT License.
