# 🎬 ReelScribe | Instagram Reel Transcriber & Comment Analyzer

**ReelScribe** is an AI-powered web application that downloads Instagram Reels, transcribes speech using OpenAI's **Whisper** model on local NVIDIA GPUs via CUDA, and scrapes top comments with live engagement metrics (likes, replies, links, and creator badges).

---

## ✨ Key Features

- ⚡ **GPU-Accelerated Speech-to-Text:**
  - Powered by OpenAI's Whisper (`medium` model with FP16 precision).
  - Optimized for modern NVIDIA GPUs with automatic VRAM caching management to prevent Out-Of-Memory (OOM) errors.
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
- 🏷️ **Hashtag Explorer (Top 50 Reels):**
  - Search any Instagram hashtag (e.g., `#coding`, `#ai`, `#fitness`) to discover top viral reels.
  - Sort by **Top Liked** or **Most Viewed** with live like counts, view counts, and video duration.
  - View full post descriptions / captions.
  - Click **Direct Video (MP4)** to stream or download the raw video directly, or open on Instagram.
  - One-click **"Transcribe & Scrape"** shortcut to load any discovered reel directly into the Whisper transcriber.
- 📥 **Export Options:**
  - Download transcripts as plain text (`.TXT`), timestamped subtitles (`.SRT`), or formatted documents (`.PDF`).
- 🎨 **Modern Dark UI:**
  - Responsive glassmorphism interface built with Tailwind CSS, custom animations, and non-blocking polling architecture.


---

## 🛠️ System Architecture & Workflow Pipeline

ReelScribe operates on a fully decoupled, non-blocking asynchronous architecture. Long-running computational tasks (GPU neural inference, in-memory audio extraction, multi-page web scraping) run in dedicated background worker threads, maintaining sub-15ms HTTP gateway responsiveness and continuous real-time UI polling updates.

```mermaid
flowchart TD
    subgraph Client["1. Client Layer (Browser)"]
        UI["Dual-Tab Reactive UI (Reel Transcriber & Hashtag Explorer)"]
        Poll["State Polling Controller (2000ms Heartbeat)"]
        Exporter["Document Exporter (.TXT, .SRT, .PDF)"]
    end

    subgraph Gateway["2. Gateway & Task Orchestrator (app.py)"]
        Router["Flask API Gateway (/process, /hashtag, /download)"]
        Dispatcher["Async Worker Dispatcher (UUIDv4 Tasks)"]
        Store[("Thread-Safe In-Memory State Store (results)")]
    end

    subgraph Pipeline1["3. Audio Stream & AI Speech Engine"]
        YTDL["yt-dlp Direct Stream URL Resolver"]
        FFmpeg["imageio-ffmpeg Subprocess Stdout Pipe"]
        AudioBuffer["PCM Float32 16kHz RAM Tensor"]
        WhisperDaemon["Daemonized Whisper Neural Preloader"]
        WhisperInfer["CUDA FP16 Tensor Inference / CPU Fallback"]
    end

    subgraph Pipeline2["4. Instagram GraphQL & Metadata Engine"]
        SessionMgr["Instaloader Session Manager (.env Hot-Reloading)"]
        PostDetails["Post Metadata & Taken-At Resolver"]
        CommentScraper["Dual-Path Comment Scraper (Embedded Edges + GraphQL Hash)"]
    end

    subgraph Pipeline3["5. Viral Hashtag Discovery & Pagination"]
        TagCleaner["URL & Hashtag Normalizer"]
        SectionParser["Explore Layout Parser (Clips, Grid, Fill)"]
        ReelValidator["is_authentic_reel Strict Video Validator"]
        CursorLoop["Multi-Page next_max_id Cursor Pagination"]
        Ranker["Engagement Ranker (Top Liked & Viewed 50)"]
    end

    subgraph Visualizers["6. Interactive Architecture Dashboards"]
        ArchV1["Architecture v1: 3-Tier Canvas & SVG Pulse Lines (/architecture)"]
        ArchV2["Architecture v2: Cyber Mesh HUD & Live Packet Telemetry (/architecture-v2)"]
    end

    %% Flow connections
    UI -->|POST /process {url}| Router
    UI -->|POST /hashtag {tag, limit}| Router
    Router --> Dispatcher
    Dispatcher --> Store
    Dispatcher -->|Worker Thread 1| YTDL
    Dispatcher -->|Worker Thread 1| SessionMgr
    Dispatcher -->|Worker Thread 2| TagCleaner

    YTDL --> FFmpeg --> AudioBuffer --> WhisperInfer
    WhisperDaemon -.->|Preloaded Weights| WhisperInfer
    SessionMgr --> PostDetails --> CommentScraper

    TagCleaner --> SectionParser --> CursorLoop --> ReelValidator --> Ranker

    WhisperInfer -->|Transcript & Timestamps| Store
    CommentScraper -->|Comments & Likes| Store
    Ranker -->|Top 50 Reels Payload| Store

    Store -.->|HTTP GET 2000ms Poll| Poll
    Poll --> UI
    UI -->|Trigger Download| Exporter
    Exporter -.-> Router
```

### ⚙️ Core Operational Subsystems

| Subsystem | Primary Modules | Key Technologies & Protocols | Architectural Role |
| :--- | :--- | :--- | :--- |
| **Client Interaction** | `templates/index.html`<br>`static/main.js` | HTML5, Vanilla JS, CSS Glassmorphism | Dual-tab reactive UI, non-blocking 2s polling heartbeat, `<meta name="referrer" content="no-referrer">` CDN hotlink protection. |
| **Gateway & Dispatcher** | `app.py` | Flask 3.0, `threading`, `uuid`, `io.BytesIO` | Validates payloads, allocates UUIDv4 task tokens, dispatches background threads, streams documents directly from RAM. |
| **In-Memory Audio Pipe** | `utils/downloader.py` | `yt-dlp`, `imageio-ffmpeg`, `numpy` | Streams signed media URLs, pipes raw audio through FFmpeg stdout directly into 16kHz Float32 PCM RAM arrays without disk I/O. |
| **Neural Speech-to-Text** | `utils/transcriber.py` | OpenAI Whisper, PyTorch (CUDA / CPU) | Daemonized background preloader eliminates cold starts; executes FP16 neural inference on GPU tensor cores with CPU fallback. |
| **Instagram GraphQL Engine** | `utils/comments.py` | `instaloader`, Web GraphQL Hash `97b41c...` | Hot-reloading session authentication, post creation timestamp extraction, edge traversal, verified badge & URL detection. |
| **Viral Hashtag Explorer** | `utils/hashtag.py` | Instagram Web Info API, regex | Multi-page `next_max_id` pagination loop, `is_authentic_reel` video validation (excludes static photos/carousels), engagement ranker. |
| **Architecture Dashboards** | `architecture/`<br>`architecture_v2/` | Dynamic SVG, CSS keyframe glow, Web Telemetry | Standalone & embedded interactive visualizers featuring continuous packet flow animations, live telemetry, and substructure code inspectors. |

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
If you have a compatible NVIDIA GPU (CUDA 12.x):
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
├── app.py                   # Main Flask application, background workers & API routes
├── architecture/            # Standalone Interactive Architecture Flow v1 visualizer
├── architecture_v2/         # Next-Gen Cyber Mesh Architecture v2 visualizer
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
│   └── index.html           # Main frontend web page (Reels, Hashtags & Architecture)
│
└── utils/
    ├── __init__.py
    ├── downloader.py        # Audio stream extraction via yt-dlp & FFmpeg
    ├── transcriber.py       # Whisper GPU model loading, inference & SRT generator
    ├── comments.py          # Instagram GraphQL comment parser (likes, links, replies)
    └── hashtag.py           # Hashtag top/viewed reels scraper & direct link extractor
```

---

## ❓ Troubleshooting

### 1. "CUDA out of memory" error
- **Cause:** Large Whisper model variants require significant VRAM and may exceed available GPU memory on systems with limited video RAM.
- **Fix:** ReelScribe defaults to the `medium` model configured with FP16 precision, balancing high transcription accuracy with efficient VRAM consumption (~3.5GB–4GB). If running on a GPU with limited VRAM, change `"medium"` to `"small"` or `"base"` in `utils/transcriber.py`. If no compatible CUDA device is detected, the application automatically runs on CPU.

### 2. "Login required" or 0 comments fetched
- **Cause:** Instagram flagged password-based login or your `sessionid` expired.
- **Fix:** Refresh your Instagram session in your browser, copy the latest `sessionid` cookie value, update `IG_SESSIONID` in `.env`, and restart `app.py`.

### 3. "FFmpeg not found"
- **Cause:** FFmpeg is not installed or not in your system `PATH`.
- **Fix:** Install FFmpeg and add its `bin` folder to your Environment Variables, then restart your terminal.

---

## 📄 License

This project is licensed under the MIT License.
