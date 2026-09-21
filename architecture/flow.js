/**
 * ReelScribe Interactive Architecture Flow Engine
 * Dynamic SVG Connectors, Continuous Flow Animations, Substructure Inspector, and Live Simulation
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==================== SUBSTRUCTURE REGISTRY ====================
    const SUBSTRUCTURE_REGISTRY = {
        "client-ui": {
            tier: "TIER 1 — CLIENT LAYER",
            title: "Dual-Mode Web Application Interface",
            file: "templates/index.html & static/main.js",
            icon: "🖥️",
            desc: "Responsive modern web frontend built with vanilla HTML5, CSS3, Tailwind utilities, and modular JavaScript. Features separate operational tabs for single-reel transcription and multi-reel hashtag discovery, instant video streaming, and rich engagement analytics.",
            functions: [
                { name: "switchTab(target)", in: "target ('transcriber' | 'hashtag')", out: "void", role: "Toggles active view, controls visibility, and resets form focus" },
                { name: "renderReelsGrid()", in: "currentHashtagData, currentSortMode", out: "void", role: "Builds responsive card grid with thumbnails, metrics, and timestamps" },
                { name: "linkifyText(text)", in: "escapedText (string)", out: "HTML string", role: "Auto-detects and converts raw URLs into clickable anchor tags" },
                { name: "formatNumber(num)", in: "num (integer)", out: "string ('15.1K', '1.2M')", role: "Formats likes and view counters into human-readable compact metrics" }
            ],
            schema: `{
  "ui_state": {
    "active_tab": "hashtag",
    "sort_mode": "liked",
    "inputs": {
      "reel_url": "https://www.instagram.com/reel/DdU_XfZREJJ/",
      "hashtag_query": "coding",
      "limit": 50
    },
    "referrer_policy": "no-referrer"
  }
}`,
            code: `// Dual-mode tab switcher
function switchTab(target) {
    if (target === "transcriber") {
        tabTranscriber.classList.add("active");
        tabHashtag.classList.remove("active");
        sectionTranscriber.classList.remove("hidden");
        sectionHashtag.classList.add("hidden");
    } else {
        tabHashtag.classList.add("active");
        tabTranscriber.classList.remove("active");
        sectionHashtag.classList.remove("hidden");
        sectionTranscriber.classList.add("hidden");
    }
}`,
            resilience: [
                "HTML <meta name='referrer' content='no-referrer'> stops Facebook CDN hotlink 403 blocks.",
                "Safe HTML escaping on all caption and comment strings prevents XSS injections.",
                "Automatic thumbnail fallback with placeholder image if CDN signature expires."
            ]
        },

        "client-poll": {
            tier: "TIER 1 — CLIENT LAYER",
            title: "Client State & Async Polling Controller",
            file: "static/main.js",
            icon: "⏱️",
            desc: "Orchestrates background asynchronous execution using a 2000ms polling heartbeat. Polls the Flask backend for task state transitions (queued → processing → completed / error) and updates DOM components dynamically.",
            functions: [
                { name: "pollResult()", in: "currentTaskId", out: "Promise<void>", role: "Queries /result/<task_id> for transcription status and comments" },
                { name: "pollHashtagResult()", in: "hashtagTaskId", out: "Promise<void>", role: "Queries /result/<task_id> for viral hashtag discovery completion" },
                { name: "setLoading(bool)", in: "isLoading (boolean)", out: "void", role: "Toggles spinner, disables buttons, and manages user feedback messages" }
            ],
            schema: `{
  "polling_request": {
    "endpoint": "/result/8b248a39-44d5-45d6-8488-8255018e6ce9",
    "method": "GET",
    "interval_ms": 2000,
    "max_retries": 150
  }
}`,
            code: `async function pollResult() {
    if (!currentTaskId) return;
    try {
        const response = await fetch(\`/result/\${currentTaskId}\`);
        const data = await response.json();
        
        if (data.status === "processing" || data.status === "queued") {
            statusMessage.textContent = data.message || "Processing in background...";
        } else if (data.status === "completed") {
            clearInterval(pollInterval);
            displayResults(data);
        } else if (data.status === "error") {
            clearInterval(pollInterval);
            statusMessage.textContent = \`Error: \${data.message}\`;
        }
    } catch(err) {
        console.error("Polling error:", err);
    }
}`,
            resilience: [
                "Clears interval timer automatically on terminal states (completed or error) to prevent memory leaks.",
                "Handles temporary network hiccups gracefully without crashing client application.",
                "Decoupled architecture: long AI inference runs never block the browser main thread."
            ]
        },

        "client-export": {
            tier: "TIER 1 — CLIENT LAYER",
            title: "Multi-Format Document Exporter",
            file: "app.py:download_transcript",
            icon: "📥",
            desc: "Manages instant document compilation and delivery. Allows users to export completed Whisper transcriptions in standard plain text (.txt), subtitle format with millisecond timestamps (.srt), or clean PDF document format (.pdf).",
            functions: [
                { name: "download_transcript(id, fmt)", in: "task_id (str), format (txt|srt|pdf)", out: "Flask send_file Response", role: "Fetches completed task and streams file via io.BytesIO buffer" },
                { name: "generate_srt(segments)", in: "segments (list of dicts)", out: "string (SubRip format)", role: "Transforms start/end float timestamps into 00:00:00,000 SRT tracks" },
                { name: "pdf.multi_cell()", in: "safe_transcript (latin-1 sanitized)", out: "PDF binary stream", role: "Renders formatted printable PDF transcript using FPDF" }
            ],
            schema: `{
  "download_params": {
    "task_id": "8b248a39-44d5-45d6-8488-8255018e6ce9",
    "format": "pdf",
    "mimetype": "application/pdf",
    "as_attachment": true,
    "filename": "transcript.pdf"
  }
}`,
            code: `@app.route("/download/<task_id>/<format>")
def download_transcript(task_id, format):
    res = results.get(task_id)
    if not res or res.get("status") != "completed":
        return "Task not found", 404
        
    transcript = res.get("transcript", "")
    if format == "txt":
        mem = io.BytesIO(transcript.encode('utf-8'))
        return send_file(mem, as_attachment=True, download_name="transcript.txt")
    elif format == "srt":
        srt_content = generate_srt(res.get("segments", []))
        mem = io.BytesIO(srt_content.encode('utf-8'))
        return send_file(mem, as_attachment=True, download_name="transcript.srt")
    elif format == "pdf":
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("helvetica", size=12)
        safe = transcript.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 10, text=safe)
        return send_file(io.BytesIO(bytes(pdf.output())), as_attachment=True, download_name="transcript.pdf")`,
            resilience: [
                "Zero disk footprint: all exports generated in RAM using io.BytesIO streaming.",
                "Character set fallback: encodes non-Latin unicode emojis safely for FPDF compliance.",
                "Validates task completion status before allowing file download."
            ]
        },

        "server-router": {
            tier: "TIER 2 — GATEWAY LAYER",
            title: "Flask API Gateway & Route Orchestrator",
            file: "app.py",
            icon: "⚡",
            desc: "Primary application server entrypoint running Flask 3.0. Handles incoming client HTTP traffic, extracts and validates request payloads, assigns unique execution tokens, and dispatches background worker threads.",
            functions: [
                { name: "index()", in: "GET /", out: "render_template('index.html')", role: "Serves main dual-tab frontend application" },
                { name: "process()", in: "POST /process {url: str}", out: "JSON {task_id: str}", role: "Validates reel URL, allocates task ID, and starts process_reel thread" },
                { name: "hashtag()", in: "POST /hashtag {tag: str, limit: int}", out: "JSON {task_id: str}", role: "Validates hashtag, allocates task ID, and starts process_hashtag thread" },
                { name: "get_result(task_id)", in: "GET /result/<task_id>", out: "JSON results[task_id]", role: "Returns task state, progress message, or completed payload" }
            ],
            schema: `{
  "post_process_request": {
    "url": "https://www.instagram.com/reel/DdU_XfZREJJ/"
  },
  "post_hashtag_request": {
    "tag": "#coding",
    "limit": 50
  }
}`,
            code: `@app.route("/process", methods=["POST"])
def process():
    data = request.get_json() or {}
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
    return jsonify({"task_id": task_id})`,
            resilience: [
                "Asynchronous thread dispatch returns 200 OK with task_id within 15 milliseconds.",
                "Input sanitization guards against empty or malformed URLs.",
                "Debug mode autoreloader ensures live code refreshes during active development."
            ]
        },

        "server-queue": {
            tier: "TIER 2 — GATEWAY LAYER",
            title: "Async Task Dispatcher & State Repository",
            file: "app.py:results & threading",
            icon: "🧵",
            desc: "In-memory thread-safe state repository that maps unique UUIDv4 task identifiers to their live lifecycle status, error logs, and final completion payloads. Decouples client HTTP connections from long-running network operations.",
            functions: [
                { name: "process_reel(url, task_id)", in: "url (str), task_id (str)", out: "void", role: "Parallel worker that extracts audio, runs Whisper, and fetches GraphQL comments" },
                { name: "process_hashtag(tag, task_id, limit)", in: "tag (str), task_id (str), limit (int)", out: "void", role: "Worker that paginates explore sections, validates clips, and sorts top 50 reels" },
                { name: "results[task_id]", in: "Dict storage", out: "Task State Object", role: "Global thread-safe store for {status, message, transcript, comments, data}" }
            ],
            schema: `{
  "task_state": {
    "8b248a39-44d5-45d6-8488-8255018e6ce9": {
      "status": "completed",
      "message": "Processing complete!",
      "transcript": "Imagine all your friends give you digital presents...",
      "segments": [{"start": 0.0, "end": 4.5, "text": "..."}],
      "comments": [{"username": "forgetzstudio", "likes": 0, "links": []}],
      "post_info": {
        "owner": "savadostudios",
        "post_date": "Sep 16, 2026 12:23 AM UTC",
        "time_ago": "4d ago"
      }
    }
  }
}`,
            code: `def process_hashtag(tag, task_id, limit=50):
    try:
        results[task_id] = {"status": "processing", "message": f"Exploring Instagram #{tag}..."}
        data = get_top_reels_by_hashtag(tag, limit=limit)
        results[task_id] = data
    except Exception as e:
        results[task_id] = {"status": "error", "message": str(e)}`,
            resilience: [
                "Individual worker exceptions are caught and stored in results[task_id] without crashing server.",
                "UUIDv4 task tokens prevent collision between concurrent requests.",
                "Separation of concerns: failures in comment scraping do not abort audio transcription."
            ]
        },

        "worker-audio": {
            tier: "TIER 3 — PIPELINES LAYER",
            title: "Media Downloader & FFmpeg In-Memory Audio Pipe",
            file: "utils/downloader.py",
            icon: "🎵",
            desc: "Extracts direct raw video and audio streams from Instagram URLs using yt-dlp authenticated with credentials. Pipes data through a bundled imageio-ffmpeg subprocess in-memory to emit normalized 16kHz mono Float32 audio directly into RAM without touching disk.",
            functions: [
                { name: "get_audio_from_url(url)", in: "url (string)", out: "np.ndarray (float32)", role: "Fetches stream URL via yt-dlp and pipes into stdout via ffmpeg" },
                { name: "ydl.extract_info(download=False)", in: "url, download=False", out: "dict info", role: "Resolves direct signed CDN media URL without downloading file" },
                { name: "subprocess.Popen(cmd)", in: "ffmpeg cmd list", out: "stdout byte stream", role: "Streams s16le raw audio: 1 channel, 16,000Hz sampling rate" }
            ],
            schema: `{
  "audio_specifications": {
    "format": "s16le raw PCM",
    "channels": 1,
    "sample_rate_hz": 16000,
    "normalization": "Float32 [-1.0, 1.0]",
    "storage": "In-memory RAM buffer"
  }
}`,
            code: `def get_audio_from_url(url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'username': os.getenv("IG_USERNAME"),
        'password': os.getenv("IG_PASSWORD")
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info['url']
        
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg_exe, '-i', stream_url, '-f', 's16le', '-ac', '1', '-ar', '16000', '-']
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    audio_data, _ = process.communicate()
    return np.frombuffer(audio_data, np.int16).astype(np.float32) / 32768.0`,
            resilience: [
                "Zero disk I/O eliminates file cleanup races, temp directory leaks, and Windows file locks.",
                "Bundled imageio-ffmpeg guarantees FFmpeg is present on any system without external PATH setup.",
                "Stream-only extraction consumes minimal bandwidth by resolving CDN audio tracks directly."
            ]
        },

        "worker-whisper": {
            tier: "TIER 3 — PIPELINES LAYER",
            title: "OpenAI Whisper AI Speech-to-Text Engine",
            file: "utils/transcriber.py",
            icon: "🧠",
            desc: "High-accuracy neural automatic speech recognition (ASR) system. A daemon thread preloads OpenAI's Whisper model into memory at server startup. Automatically leverages CUDA GPU acceleration (FP16) when available, falling back smoothly to multi-threaded CPU inference.",
            functions: [
                { name: "get_model()", in: "None", out: "whisper.Whisper model", role: "Singleton loader: loads model once into RAM/VRAM with automatic CUDA detection" },
                { name: "transcribe_audio(audio_np)", in: "audio_np (Float32 ndarray)", out: "dict {text, segments}", role: "Executes model inference on audio array, returning text & timestamps" },
                { name: "generate_srt(segments)", in: "segments (list of dicts)", out: "string (SRT file)", role: "Converts Whisper start/end timestamps into formatted subtitle cues" }
            ],
            schema: `{
  "transcription_result": {
    "text": "Imagine all your friends give you digital presents...",
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 3.82,
        "text": " Imagine all your friends give you digital presents."
      }
    ],
    "language": "en"
  }
}`,
            code: `def transcribe_audio(audio_np):
    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # Run Whisper inference
    result = model.transcribe(
        audio_np,
        fp16=(device == "cuda")
    )
    return {
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", [])
    }`,
            resilience: [
                "Preloaded singleton daemon eliminates 5-10 second cold-start latency per transcription request.",
                "Automatic hardware adaptation: FP16 on NVIDIA GPUs, Float32 on CPUs.",
                "Extracts detailed timestamped segments for exact synchronized subtitle export."
            ]
        },

        "worker-comments": {
            tier: "TIER 3 — PIPELINES LAYER",
            title: "Instagram Metadata & GraphQL Comment Scraper",
            file: "utils/comments.py",
            icon: "💬",
            desc: "Dual-strategy scraper using Instaloader with authenticated session cookies. Extracts post timestamp, creator handle, and uses Instagram's web GraphQL query hash to scrape top comments, reply counts, like counts, and embedded links.",
            functions: [
                { name: "get_instaloader_instance()", in: "None", out: "Instaloader", role: "Session manager with dynamic .env sessionid reloader" },
                { name: "get_post_details(reel_url)", in: "reel_url (string)", out: "dict post_info", role: "Resolves post creation time (taken_at), author, likes, and comments count" },
                { name: "get_top_comments(reel_url, max)", in: "reel_url (str), max (int=30)", out: "list of dicts", role: "Dual-strategy scraper: embedded post edges + GraphQL query hash" },
                { name: "parse_comment_node(node)", in: "node (dict)", out: "dict structured_comment", role: "Extracts username, verified check, likes, replies, profile picture, and URLs" }
            ],
            schema: `{
  "comment_node": {
    "id": "17955329181227071",
    "username": "forgetzstudio",
    "text": "keren kak check out https://example.com",
    "likes": 12,
    "replies": 3,
    "links": ["https://example.com"],
    "is_verified": false,
    "profile_pic_url": "https://instagram...fbcdn.net/..."
  }
}`,
            code: `def get_top_comments(reel_url, max_comments=30):
    L = get_instaloader_instance()
    shortcode = extract_shortcode(reel_url)
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    
    # Strategy 1: Embedded metadata edges
    edges = post._node.get('edge_media_to_parent_comment', {}).get('edges', [])
    # Strategy 2: Web GraphQL query hash iterator
    graphql_iter = NodeIterator(
        L.context,
        '97b41c52301f77ce508f55e66d17620e',
        lambda d: d['data']['shortcode_media']['edge_media_to_parent_comment'],
        parse_comment_node,
        {'shortcode': post.shortcode}
    )`,
            resilience: [
                "Hot-reloads IG_SESSIONID from .env on the fly without needing server reboots.",
                "Dual-strategy fallback: if GraphQL hits rate-limits, falls back to embedded edges and post.get_comments().",
                "Regex URL extraction isolates external link spam and promotions."
            ]
        },

        "worker-hashtag": {
            tier: "TIER 3 — PIPELINES LAYER",
            title: "Hashtag Viral Discovery, Validator & Paginator",
            file: "utils/hashtag.py",
            icon: "🏷️",
            desc: "Multi-page viral reel discovery engine. Normalizes explore tags, traverses Instagram section layouts, strictly filters out non-reel photos/carousels via is_authentic_reel(), follows next_max_id pagination cursors to collect 50+ items, and ranks top liked and top viewed reels.",
            functions: [
                { name: "clean_tag_name(tag)", in: "raw_tag (string | URL)", out: "string ('coding')", role: "Strips explore/tags/ URLs, # symbols, spaces, and punctuation" },
                { name: "is_authentic_reel(m)", in: "media_dict (dict)", out: "boolean", role: "Strictly verifies playable video_versions, product_type == 'clips', duration > 0" },
                { name: "format_time_ago(ts)", in: "timestamp (int UNIX)", out: "string ('2d ago')", role: "Converts post epoch seconds into relative time badges" },
                { name: "get_top_reels_by_hashtag(tag, limit)", in: "tag (str), limit (int=50)", out: "dict with top_liked, top_viewed", role: "Multi-page cursor crawler that extracts, validates, and ranks 50 viral reels" }
            ],
            schema: `{
  "viral_reel_result": {
    "shortcode": "DdU_XfZREJJ",
    "reel_url": "https://www.instagram.com/reel/DdU_XfZREJJ/",
    "video_url": "https://instagram.fded1-1.fna.fbcdn.net/...",
    "thumbnail": "https://instagram.fded1-1.fna.fbcdn.net/...",
    "owner": "savadostudios",
    "likes": 15150,
    "views": 152354,
    "duration": 24.1,
    "taken_at": 1789518239,
    "post_date": "Sep 16, 2026 12:23 AM UTC",
    "time_ago": "4d ago",
    "caption": "Imagine all your friends give you digital presents..."
  }
}`,
            code: `def is_authentic_reel(m):
    if not isinstance(m, dict) or not m.get('code'):
        return False
    video_versions = m.get('video_versions', [])
    if not video_versions or m.get('media_type') == 1:
        return False
    if m.get('media_type') == 8 and not video_versions:
        return False
    return (
        m.get('product_type') == 'clips' or
        bool(m.get('clips_metadata')) or
        m.get('media_type') == 2 or
        m.get('video_duration', 0) > 0
    )`,
            resilience: [
                "Strict is_authentic_reel() validator permanently eliminates static images and photo carousels.",
                "Multi-page pagination loop automatically follows next_max_id until requested limit (50 reels) is met.",
                "Preserves direct signed CDN video URLs with no-referrer metadata for direct browser playback."
            ]
        }
    };

    // ==================== INTERACTIVE DRAWER LOGIC ====================
    const backdrop = document.getElementById("substructureBackdrop");
    const drawer = document.getElementById("substructureDrawer");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const btnDrawerCloseFooter = document.getElementById("btnDrawerCloseFooter");

    function openSubstructureDrawer(componentKey) {
        const comp = SUBSTRUCTURE_REGISTRY[componentKey];
        if (!comp) return;

        document.getElementById("drawerTier").textContent = comp.tier;
        document.getElementById("drawerTitle").textContent = comp.title;
        document.getElementById("drawerFileTag").textContent = comp.file;
        document.getElementById("drawerIcon").textContent = comp.icon;
        document.getElementById("drawerDesc").textContent = comp.desc;
        document.getElementById("drawerSchemaCode").textContent = comp.schema;
        document.getElementById("drawerSourceCode").textContent = comp.code;
        document.getElementById("drawerFilePath").textContent = comp.file;

        // Functions Table
        const fnBody = document.getElementById("drawerFunctionsBody");
        fnBody.innerHTML = "";
        comp.functions.forEach(fn => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-white/5 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-pink-400 font-bold">${fn.name}</td>
                <td class="p-3 text-gray-400">${fn.in}</td>
                <td class="p-3 text-purple-300">${fn.out}</td>
                <td class="p-3 text-gray-300 font-sans">${fn.role}</td>
            `;
            fnBody.appendChild(tr);
        });

        // Resilience List
        const resList = document.getElementById("drawerResilienceList");
        resList.innerHTML = "";
        comp.resilience.forEach(item => {
            const li = document.createElement("li");
            li.className = "flex items-start gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5";
            li.innerHTML = `<span class="text-emerald-400 font-bold">✓</span> <span>${item}</span>`;
            resList.appendChild(li);
        });

        // Open Drawer
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100");
        drawer.classList.remove("translate-x-full");

        // Highlight active node in canvas
        document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("node-active"));
        const activeNode = document.getElementById(`node-${componentKey}`);
        if (activeNode) activeNode.classList.add("node-active");

        addLog(`[INSPECT] Inspected substructure: ${comp.title} (${comp.file})`);
    }

    function closeSubstructureDrawer() {
        backdrop.classList.add("opacity-0", "pointer-events-none");
        backdrop.classList.remove("opacity-100");
        drawer.classList.add("translate-x-full");
        document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("node-active"));
    }

    if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", closeSubstructureDrawer);
    if (btnDrawerCloseFooter) btnDrawerCloseFooter.addEventListener("click", closeSubstructureDrawer);
    if (backdrop) backdrop.addEventListener("click", closeSubstructureDrawer);

    // Attach click listener to all nodes
    document.querySelectorAll(".arch-node").forEach(node => {
        node.addEventListener("click", () => {
            const compKey = node.getAttribute("data-component");
            if (compKey) openSubstructureDrawer(compKey);
        });
    });

    // ==================== DYNAMIC SVG FLOW LINE ENGINE ====================
    const canvas = document.getElementById("architectureCanvas");
    const flowPathsGroup = document.getElementById("flowPathsGroup");

    // Connections definition
    const CONNECTIONS = [
        // Reel Transcriber Pipeline (Purple / Pink)
        { from: "node-client-ui", to: "node-server-router", type: "purple", mode: "reel" },
        { from: "node-server-router", to: "node-server-queue", type: "purple", mode: "reel" },
        { from: "node-server-queue", to: "node-worker-audio", type: "purple", mode: "reel" },
        { from: "node-worker-audio", to: "node-worker-whisper", type: "purple", mode: "reel" },
        { from: "node-server-queue", to: "node-worker-comments", type: "pink", mode: "reel" },
        { from: "node-worker-whisper", to: "node-server-queue", type: "purple", mode: "reel" },
        { from: "node-worker-comments", to: "node-server-queue", type: "pink", mode: "reel" },

        // Hashtag Explorer Pipeline (Cyan)
        { from: "node-client-ui", to: "node-server-router", type: "cyan", mode: "hashtag" },
        { from: "node-server-router", to: "node-server-queue", type: "cyan", mode: "hashtag" },
        { from: "node-server-queue", to: "node-worker-hashtag", type: "cyan", mode: "hashtag" },
        { from: "node-worker-hashtag", to: "node-server-queue", type: "cyan", mode: "hashtag" },

        // Response & Export Pipeline (Emerald)
        { from: "node-server-queue", to: "node-client-poll", type: "emerald", mode: "all" },
        { from: "node-client-poll", to: "node-client-ui", type: "emerald", mode: "all" },
        { from: "node-client-ui", to: "node-client-export", type: "emerald", mode: "all" }
    ];

    let currentMode = "all";

    function drawConnectors() {
        if (!canvas || !flowPathsGroup) return;
        flowPathsGroup.innerHTML = "";

        const canvasRect = canvas.getBoundingClientRect();

        CONNECTIONS.forEach((conn, idx) => {
            const fromEl = document.getElementById(conn.from);
            const toEl = document.getElementById(conn.to);
            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            // Calculate start and end coordinates relative to canvas
            const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
            const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
            const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
            const y2 = toRect.top + toRect.height / 2 - canvasRect.top;

            // Generate smooth cubic bezier curve
            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx1 = x1 + dx * 0.2;
            const cy1 = y1 + dy * 0.8;
            const cx2 = x1 + dx * 0.8;
            const cy2 = y1 + dy * 0.2;

            const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            // 1. Static base background line
            const bgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bgPath.setAttribute("d", pathData);
            bgPath.setAttribute("class", "connector-bg");
            flowPathsGroup.appendChild(bgPath);

            // 2. Animated continuous glowing flow line
            const flowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            flowPath.setAttribute("d", pathData);
            flowPath.setAttribute("id", `flow-${conn.from}-${conn.to}`);
            
            let colorClass = "flow-purple";
            if (conn.type === "pink") colorClass = "flow-pink";
            else if (conn.type === "cyan") colorClass = "flow-cyan";
            else if (conn.type === "emerald") colorClass = "flow-emerald";

            flowPath.setAttribute("class", `connector-flow ${colorClass}`);

            // Apply filter mode
            if (currentMode !== "all" && conn.mode !== "all" && conn.mode !== currentMode) {
                flowPath.classList.add("path-dimmed");
            }

            flowPathsGroup.appendChild(flowPath);
        });
    }

    // Initial render and resize hook
    window.addEventListener("resize", drawConnectors);
    window.addEventListener("scroll", drawConnectors);
    setTimeout(drawConnectors, 100);

    // ==================== MODE SWITCHER ====================
    const modeButtons = document.querySelectorAll(".mode-btn");
    modeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            modeButtons.forEach(b => {
                b.classList.remove("active");
                b.classList.add("text-gray-400");
            });
            btn.classList.add("active");
            btn.classList.remove("text-gray-400");

            currentMode = btn.getAttribute("data-mode") || "all";
            applyModeFilter(currentMode);
        });
    });

    function applyModeFilter(mode) {
        addLog(`[MODE] Switched topology filter to: ${mode.toUpperCase()}`);

        const nodes = document.querySelectorAll(".arch-node");
        nodes.forEach(node => {
            const id = node.id;
            node.classList.remove("node-dimmed");

            if (mode === "reel") {
                if (id === "node-worker-hashtag") node.classList.add("node-dimmed");
            } else if (mode === "hashtag") {
                if (id === "node-worker-audio" || id === "node-worker-whisper" || id === "node-client-export") {
                    node.classList.add("node-dimmed");
                }
            }
        });

        drawConnectors();
    }

    // ==================== LIVE SIMULATION ENGINE ====================
    const btnSimulate = document.getElementById("btnSimulate");
    const btnResetSim = document.getElementById("btnResetSim");
    const simIcon = document.getElementById("simIcon");
    const simText = document.getElementById("simText");
    const telemetryStatus = document.getElementById("telemetryStatus");
    const telemetryStep = document.getElementById("telemetryStep");
    const logStream = document.getElementById("logStream");
    const logCounter = document.getElementById("logCounter");

    let isSimulating = false;
    let simStep = 0;
    let simTimer = null;
    let eventCount = 4;

    function addLog(msg) {
        if (!logStream) return;
        eventCount++;
        const div = document.createElement("div");
        div.className = "text-gray-300 font-mono text-xs";
        
        if (msg.includes("[SYS_") || msg.includes("[INIT]")) div.className = "text-gray-500";
        else if (msg.includes("[AUDIO]") || msg.includes("[DAEMON]")) div.className = "text-purple-400";
        else if (msg.includes("[SCRAPER]") || msg.includes("[INSTA")) div.className = "text-pink-400";
        else if (msg.includes("[HASHTAG]") || msg.includes("[MODE]")) div.className = "text-cyan-400";
        else if (msg.includes("[COMPLETE]") || msg.includes("[READY]")) div.className = "text-emerald-400 font-bold";

        div.textContent = msg;
        logStream.appendChild(div);
        logStream.scrollTop = logStream.scrollHeight;
        if (logCounter) logCounter.textContent = `Log: ${eventCount} events`;
    }

    const SIMULATION_STEPS = [
        {
            title: "Step 1: User Input Dispatched",
            nodeId: "node-client-ui",
            status: "HTTP POST /process Dispatched",
            log: "[CLIENT] User pasted Instagram Reel URL -> Dispatched POST /process {url: '...'}"
        },
        {
            title: "Step 2: Gateway Allocated UUID Task",
            nodeId: "node-server-router",
            status: "Task ID Allocated: 8b248a39...",
            log: "[ROUTER] Generated task_id: 8b248a39-44d5-45d6-8488-8255018e6ce9. Status: queued."
        },
        {
            title: "Step 3: Background Worker Thread Spawned",
            nodeId: "node-server-queue",
            status: "Spawning Worker Threads...",
            log: "[THREAD] Spawning background thread for process_reel(). Decoupling client connection."
        },
        {
            title: "Step 4: Media Streaming & Whisper Inference",
            nodeId: "node-worker-audio",
            status: "yt-dlp stream -> FFmpeg -> Whisper AI GPU",
            log: "[AUDIO] yt-dlp resolved stream -> FFmpeg 16kHz Float32 PCM -> Whisper FP16 inference."
        },
        {
            title: "Step 5: GraphQL Comment Scraping Complete",
            nodeId: "node-worker-comments",
            status: "Scraped Top Comments & Post Time",
            log: "[SCRAPER] Instaloader GraphQL query 97b41c523... returned 30 comments with link counts."
        },
        {
            title: "Step 6: Task Completed & Polled to UI",
            nodeId: "node-client-poll",
            status: "Pipeline Completed! Results Rendered ✅",
            log: "[COMPLETE] Polling engine received status: completed. Rendered transcript and export links."
        }
    ];

    function runNextSimStep() {
        if (simStep >= SIMULATION_STEPS.length) {
            stopSimulation();
            telemetryStatus.textContent = "Simulation Finished ✅";
            telemetryStep.classList.add("hidden");
            return;
        }

        const stepData = SIMULATION_STEPS[simStep];
        telemetryStatus.textContent = stepData.status;
        telemetryStep.classList.remove("hidden");
        telemetryStep.textContent = `STEP ${simStep + 1}/${SIMULATION_STEPS.length}`;

        // Highlight active step node
        document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("node-pulsing", "node-active"));
        const targetNode = document.getElementById(stepData.nodeId);
        if (targetNode) {
            targetNode.classList.add("node-pulsing", "node-active");
            targetNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        addLog(stepData.log);
        simStep++;
        simTimer = setTimeout(runNextSimStep, 2200);
    }

    function startSimulation() {
        isSimulating = true;
        simStep = 0;
        if (simIcon) simIcon.textContent = "⏸️";
        if (simText) simText.textContent = "Pause Simulation";
        addLog("[SIMULATION] Starting live pipeline trace simulation...");
        runNextSimStep();
    }

    function stopSimulation() {
        isSimulating = false;
        if (simTimer) clearTimeout(simTimer);
        if (simIcon) simIcon.textContent = "▶️";
        if (simText) simText.textContent = "Simulate Live Flow";
        document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("node-pulsing"));
    }

    if (btnSimulate) {
        btnSimulate.addEventListener("click", () => {
            if (isSimulating) {
                stopSimulation();
                addLog("[SIMULATION] Simulation paused by user.");
            } else {
                startSimulation();
            }
        });
    }

    if (btnResetSim) {
        btnResetSim.addEventListener("click", () => {
            stopSimulation();
            simStep = 0;
            telemetryStatus.textContent = "Continuous Stream Active";
            telemetryStep.classList.add("hidden");
            document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("node-pulsing", "node-active", "node-dimmed"));
            currentMode = "all";
            modeButtons.forEach(b => {
                if (b.getAttribute("data-mode") === "all") {
                    b.classList.add("active");
                    b.classList.remove("text-gray-400");
                } else {
                    b.classList.remove("active");
                    b.classList.add("text-gray-400");
                }
            });
            drawConnectors();
            addLog("[RESET] Pipeline reset to ambient continuous stream.");
        });
    }
});
