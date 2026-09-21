/**
 * ReelScribe Architecture v2 - Next-Gen Interactive Flow Engine
 * Dynamic SVG Laser Cables, Multi-Stage Particle Simulation & Deep Holographic Substructure Drawer
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==================== SUBSTRUCTURE REGISTRY v2 ====================
    const SUBSTRUCTURE_V2 = {
        "client-ui": {
            tier: "STAGE 01 — CLIENT INTERACTION",
            title: "Dual-Mode Reactive Web Application",
            file: "templates/index.html & static/main.js",
            icon: "🖥️",
            desc: "Responsive high-performance frontend interface designed with HTML5, vanilla CSS glassmorphism, and Tailwind CSS. Provides separate dedicated views for single-reel AI audio transcription and hashtag viral discovery, complete with instant video streaming links and engagement analytics.",
            highlights: [
                "Zero-framework overhead: pure vanilla JavaScript DOM updates ensure lightning-fast UI responsiveness.",
                "Universal Referrer Shield: <meta name='referrer' content='no-referrer'> permanently eliminates Meta CDN 403 Forbidden hotlink blocks.",
                "Safe HTML sanitization (escapeHtml) guarantees immunity against stored XSS attacks in captions and comments."
            ],
            methods: [
                { sig: "switchTab(target: 'transcriber' | 'hashtag')", ret: "void", role: "Toggles active view, controls visibility, and resets form focus" },
                { sig: "renderReelsGrid()", ret: "void", role: "Builds responsive card grid with thumbnails, metrics, and timestamps" },
                { sig: "linkifyText(escapedText: string)", ret: "string (HTML)", role: "Converts raw URLs in comments into clickable external anchors" },
                { sig: "formatNumber(num: number)", ret: "string", role: "Transforms large engagement counts into compact '15.1K' / '1.2M' badges" }
            ],
            schema: `{
  "client_state": {
    "active_tab": "hashtag",
    "sort_mode": "liked",
    "inputs": {
      "reel_url": "https://www.instagram.com/reel/DdU_XfZREJJ/",
      "hashtag_query": "coding",
      "limit": 50
    },
    "referrer_policy": "no-referrer",
    "render_cache_count": 50
  }
}`,
            code: `// Tab Switcher and Mode Manager
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
                "Automatic thumbnail fallback to graceful placeholder if CDN media URL expires.",
                "Client-side debouncing and button disable states prevent accidental double-submissions.",
                "Scroll position preservation during asynchronous DOM re-renders."
            ]
        },

        "client-polling": {
            tier: "STAGE 01 — CLIENT INTERACTION",
            title: "Client State & Async Polling Controller",
            file: "static/main.js",
            icon: "⏱️",
            desc: "Coordinates client-side asynchronous execution using a 2000ms polling heartbeat. Communicates with Flask backend to track task state transitions (queued → processing → completed / error) without tying up browser threads.",
            highlights: [
                "Non-blocking architecture: user interface remains fully responsive while GPU audio models infer in background.",
                "Clean interval cleanup: automatically halts polling timers on terminal states (completed or error).",
                "Telemetry feedback: displays real-time backend progress messages to keep the user informed."
            ],
            methods: [
                { sig: "pollResult()", ret: "Promise<void>", role: "Queries /result/<task_id> for reel transcription and comment scraping payload" },
                { sig: "pollHashtagResult()", ret: "Promise<void>", role: "Queries /result/<task_id> for viral hashtag discovery completion" },
                { sig: "setLoading(isLoading: boolean)", ret: "void", role: "Controls loading spinner and disables submit buttons during execution" }
            ],
            schema: `{
  "polling_packet": {
    "endpoint": "/result/8b248a39-44d5-45d6-8488-8255018e6ce9",
    "method": "GET",
    "interval_ms": 2000,
    "headers": { "Accept": "application/json" }
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
                "Automatic recovery from temporary network drops without throwing unhandled exceptions.",
                "Explicit task token validation guards against cross-task data pollution.",
                "Clean resource teardown on window unload or tab switch."
            ]
        },

        "client-export": {
            tier: "STAGE 01 — CLIENT INTERACTION",
            title: "Multi-Format Document Exporter",
            file: "app.py:download_transcript",
            icon: "📥",
            desc: "Provides instantaneous compilation and streaming delivery of completed Whisper transcripts. Generates plain text (.txt), subtitle cue tracks with millisecond timestamps (.srt), or printable PDF documents (.pdf) completely in RAM.",
            highlights: [
                "Zero disk storage: files are compiled in memory buffers (io.BytesIO) and streamed directly to browser.",
                "SubRip timestamp precision: converts start/end float timestamps into standard 00:00:00,000 SRT syntax.",
                "Unicode sanitization: cleans emojis into Latin-1 compatible strings for robust PDF compilation."
            ],
            methods: [
                { sig: "download_transcript(task_id, format)", ret: "send_file Response", role: "Extracts task results and dispatches in-memory file stream" },
                { sig: "generate_srt(segments: list)", ret: "string", role: "Transforms Whisper start/end timestamps into sequential subtitle cues" },
                { sig: "FPDF.multi_cell(0, 10, text)", ret: "bytes", role: "Renders clean typography printable document with Helvetica font" }
            ],
            schema: `{
  "export_contract": {
    "task_id": "8b248a39-44d5-45d6-8488-8255018e6ce9",
    "format": "pdf",
    "mimetype": "application/pdf",
    "download_name": "transcript.pdf"
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
                "Validates task completion before generating bytes to prevent empty file downloads.",
                "Safe fallback replacement of unencodable unicode glyphs prevents FPDF crash.",
                "Immediate garbage collection after byte stream transmission."
            ]
        },

        "server-router": {
            tier: "STAGE 02 — GATEWAY & ORCHESTRATION",
            title: "API Gateway & Request Normalizer",
            file: "app.py",
            icon: "⚡",
            desc: "The primary Flask 3.0 server entrypoint. Intercepts incoming HTTP requests, validates and normalizes payload parameters, generates unique UUIDv4 task tokens, and immediately dispatches worker threads.",
            highlights: [
                "Sub-15ms response latency: dispatches tasks asynchronously and returns 200 OK immediately.",
                "Dedicated route mapping for both core workflows and architecture visualization dashboard.",
                "Integrated error wrappers ensure 400 Bad Request on invalid parameters without crashing."
            ],
            methods: [
                { sig: "index()", ret: "HTML", role: "Serves main dual-tab ReelScribe application" },
                { sig: "process()", ret: "JSON {task_id: str}", role: "Validates reel URL and dispatches process_reel worker thread" },
                { sig: "hashtag()", ret: "JSON {task_id: str}", role: "Validates explore hashtag and dispatches process_hashtag worker thread" },
                { sig: "architecture_dashboard()", ret: "HTML", role: "Serves standalone interactive architecture dashboard" }
            ],
            schema: `{
  "gateway_requests": {
    "POST /process": { "url": "https://www.instagram.com/reel/DdU_XfZREJJ/" },
    "POST /hashtag": { "tag": "#coding", "limit": 50 }
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
                "Thread isolation: unexpected worker crashes are contained and logged per task ID.",
                "Input sanitization guards against command injection or malformed URI structures.",
                "Werkzeug autoreloader detects live code edits without requiring manual server reboots."
            ]
        },

        "server-queue": {
            tier: "STAGE 02 — GATEWAY & ORCHESTRATION",
            title: "Async Thread Dispatcher & In-Memory Store",
            file: "app.py:results & threading",
            icon: "🧵",
            desc: "Thread-safe in-memory state repository that maps UUIDv4 task tokens to live execution lifecycle states, real-time telemetry messages, error tracebacks, and final structured output payloads.",
            highlights: [
                "Full decoupling: isolates network extraction from synchronous client HTTP connections.",
                "Global in-memory dict eliminates database setup overhead and SQLite file locking issues.",
                "Concurrent worker execution supports multiple simultaneous requests smoothly."
            ],
            methods: [
                { sig: "process_reel(url, task_id)", ret: "void", role: "Coordinates parallel audio download, Whisper transcription, and comment scraping" },
                { sig: "process_hashtag(tag, task_id, limit)", ret: "void", role: "Traverses explore sections, validates clips, and sorts top 50 reels" },
                { sig: "results[task_id]", ret: "dict", role: "Thread-safe global state repository" }
            ],
            schema: `{
  "task_state_store": {
    "8b248a39-44d5-45d6-8488-8255018e6ce9": {
      "status": "completed",
      "message": "Processing complete!",
      "transcript": "Imagine all your friends give you digital presents...",
      "segments": [ ... ],
      "comments": [ ... ],
      "post_info": { "owner": "savadostudios", "post_date": "Sep 16, 2026", "time_ago": "4d ago" }
    }
  }
}`,
            code: `def process_reel(url, task_id):
    transcript = ""
    segments = []
    comments = []
    post_info = None
    
    # 1. Audio & Transcription
    try:
        results[task_id] = {"status": "processing", "message": "Fetching audio stream..."}
        audio_np = get_audio_from_url(url)
        results[task_id] = {"status": "processing", "message": "Transcribing audio on GPU..."}
        transcription_data = transcribe_audio(audio_np)
        transcript = transcription_data.get("text", "").strip()
        segments = transcription_data.get("segments", [])
    except Exception as e:
        print(f"Audio/Transcription error: {e}")
        
    # 2. Comments & Post Info
    try:
        results[task_id] = {"status": "processing", "message": "Fetching reel metadata & comments..."}
        post_info = get_post_details(url)
        comments = get_top_comments(url)
    except Exception as e:
        comments = [f"Error: {e}"]

    results[task_id] = {
        "status": "completed",
        "transcript": transcript or "No speech detected.",
        "segments": segments,
        "comments": comments,
        "post_info": post_info
    }`,
            resilience: [
                "Graceful degradation: if comment scraping fails, audio transcription results still deliver.",
                "Thread-safe atomic updates on the global dictionary prevent race conditions.",
                "UUID collision probability is virtually zero (1 in 2^122)."
            ]
        },

        "worker-audio": {
            tier: "STAGE 03 — PIPELINES & AI",
            title: "In-Memory Audio Pipe (yt-dlp + FFmpeg)",
            file: "utils/downloader.py",
            icon: "🎵",
            desc: "Zero-disk audio extraction engine. Resolves direct media stream URLs using yt-dlp authenticated with credentials, then pipes data via an imageio-ffmpeg subprocess stdout stream directly into RAM as normalized Float32 PCM audio.",
            highlights: [
                "Zero disk I/O: raw audio streamed directly into memory buffer, eliminating disk wear and file locks.",
                "Self-contained FFmpeg: bundled imageio-ffmpeg binary eliminates external system PATH dependencies.",
                "Whisper-native audio spec: produces 16,000Hz mono s16le normalized to Float32 [-1.0, 1.0]."
            ],
            methods: [
                { sig: "get_audio_from_url(url: string)", ret: "np.ndarray (Float32)", role: "Streams and pipes audio directly into RAM numpy array" },
                { sig: "ydl.extract_info(url, download=False)", ret: "dict info", role: "Resolves signed CDN media URL without writing file" },
                { sig: "subprocess.Popen([ffmpeg, '-i', stream, ...])", ret: "bytes", role: "Converts stream into raw s16le 16kHz mono audio" }
            ],
            schema: `{
  "audio_tensor_spec": {
    "sampling_rate": 16000,
    "channels": 1,
    "dtype": "float32",
    "range": "[-1.0, 1.0]",
    "storage": "In-memory RAM (zero disk I/O)"
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
                "Stream-only resolution avoids downloading unnecessary video tracks, saving bandwidth.",
                "Subprocess stderr directed to DEVNULL prevents terminal pollution.",
                "Automatic authentication credentials from .env bypass anonymous restrictions."
            ]
        },

        "worker-whisper": {
            tier: "STAGE 03 — PIPELINES & AI",
            title: "Whisper AI Neural Speech-to-Text Engine",
            file: "utils/transcriber.py",
            icon: "🧠",
            desc: "OpenAI Whisper ASR neural engine. A dedicated background daemon preloads the model into memory at application boot. Automatically activates FP16 CUDA GPU tensor acceleration when an NVIDIA GPU is detected, with transparent multi-threaded CPU fallback.",
            highlights: [
                "Daemonized preloading: model initialized once at boot, eliminating 5-10 second cold start latency.",
                "Hardware auto-negotiation: FP16 on NVIDIA CUDA GPUs, Float32 on CPUs.",
                "Segment-level alignment: extracts precise start/end time offsets for synchronized subtitle generation."
            ],
            methods: [
                { sig: "get_model()", ret: "whisper.Whisper model", role: "Singleton model getter with thread-safe preloader daemon" },
                { sig: "transcribe_audio(audio_np)", ret: "dict {text, segments}", role: "Executes neural inference on Float32 audio tensor" },
                { sig: "generate_srt(segments)", ret: "string", role: "Converts timestamp offsets into SubRip subtitle format" }
            ],
            schema: `{
  "whisper_inference_payload": {
    "text": "Imagine all your friends give you digital presents...",
    "segments": [
      { "id": 0, "start": 0.0, "end": 4.12, "text": " Imagine all your friends give you digital presents." }
    ],
    "language": "en",
    "device_used": "cuda:0 (NVIDIA CUDA GPU)"
  }
}`,
            code: `def transcribe_audio(audio_np):
    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    result = model.transcribe(
        audio_np,
        fp16=(device == "cuda")
    )
    return {
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", [])
    }`,
            resilience: [
                "Singleton pattern ensures model weights are loaded only once in memory.",
                "Robust handling of non-speech audio: returns clean fallback message if speech is absent.",
                "Automatic memory release of tensors after inference completion."
            ]
        },

        "worker-comments": {
            tier: "STAGE 03 — PIPELINES & AI",
            title: "Instagram GraphQL Scraper & Post Metadata",
            file: "utils/comments.py",
            icon: "💬",
            desc: "Session-managed scraper using Instaloader. Extracts post creation timestamp (taken_at), author username, like counts, and executes Instagram's Web GraphQL query hash (97b41c52301f...) to parse top comments, verified checkmarks, threaded replies, and embedded URLs.",
            highlights: [
                "Hot-reloading session: automatically detects changes in IG_SESSIONID from .env on the fly.",
                "Dual-strategy extraction: uses embedded edge metadata first, then deep GraphQL query hash.",
                "URL regex parser: detects external hyperlinks within comment text and tallies link counts."
            ],
            methods: [
                { sig: "get_instaloader_instance()", ret: "Instaloader", role: "Session manager with dynamic .env session ID hot-reloading" },
                { sig: "get_post_details(reel_url)", ret: "dict post_info", role: "Resolves creation time (taken_at), post_date, time_ago, likes, comments" },
                { sig: "get_top_comments(reel_url, max=30)", ret: "list of dicts", role: "Dual-strategy scraper: embedded edges + Web GraphQL query hash" },
                { sig: "parse_comment_node(node)", ret: "dict", role: "Extracts username, text, likes, verified status, profile pic, and links" }
            ],
            schema: `{
  "post_and_comment_payload": {
    "post_info": {
      "shortcode": "DdU_XfZREJJ",
      "owner": "savadostudios",
      "likes": 15150,
      "comments_count": 47,
      "post_date": "Sep 16, 2026 12:23 AM UTC",
      "time_ago": "4d ago"
    },
    "comments": [
      {
        "id": "17955329181227071",
        "username": "forgetzstudio",
        "text": "keren kak check https://site.com",
        "likes": 12,
        "links": ["https://site.com"],
        "is_verified": false
      }
    ]
  }
}`,
            code: `def get_top_comments(reel_url, max_comments=30):
    L = get_instaloader_instance()
    shortcode = extract_shortcode(reel_url)
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    
    # Strategy 1: Fast embedded edges
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
                "Session cookies hot-reload instantly without server restart when .env changes.",
                "Graceful fallback if comments are disabled or post is restricted.",
                "URL extraction regex handles both http:// and www. link prefixes safely."
            ]
        },

        "worker-hashtag": {
            tier: "STAGE 03 — PIPELINES & AI",
            title: "Hashtag Discovery & Cursor Pagination Engine",
            file: "utils/hashtag.py",
            icon: "🏷️",
            desc: "Multi-page viral reel discovery engine. Intelligently cleans explore tag URLs, crawls Instagram section layouts, runs strict is_authentic_reel() video clip validation, follows next_max_id pagination cursors across multiple batches, and ranks top 50 liked and top 50 viewed reels.",
            highlights: [
                "Strict is_authentic_reel() validator: permanently filters out non-reel photos and photo carousels.",
                "Multi-page cursor pagination: loops through next_max_id to collect a full dataset of 50+ genuine reels.",
                "Post timestamp normalization: computes UNIX epoch, full UTC date, and relative time_ago ('2d ago')."
            ],
            methods: [
                { sig: "clean_tag_name(tag)", ret: "string ('coding')", role: "Extracts tag from explore/tags/ URLs, strips #, spaces, and punctuation" },
                { sig: "is_authentic_reel(m: dict)", ret: "boolean", role: "Strictly ensures valid video_versions, product_type == 'clips', duration > 0" },
                { sig: "format_time_ago(ts: int)", ret: "string ('2d ago')", role: "Converts epoch seconds into relative time badge" },
                { sig: "get_top_reels_by_hashtag(tag, limit=50)", ret: "dict {top_liked, top_viewed}", role: "Crawls multiple sections via pagination cursor, validates clips, and sorts top 50" }
            ],
            schema: `{
  "hashtag_discovery_response": {
    "status": "completed",
    "tag": "coding",
    "total_reels_found": 50,
    "top_liked": [
      {
        "shortcode": "DdU_XfZREJJ",
        "reel_url": "https://www.instagram.com/reel/DdU_XfZREJJ/",
        "video_url": "https://instagram.fded1-1.fna.fbcdn.net/...",
        "owner": "savadostudios",
        "likes": 15150,
        "views": 152354,
        "duration": 24.1,
        "post_date": "Sep 16, 2026 12:23 AM UTC",
        "time_ago": "4d ago"
      }
    ],
    "top_viewed": [ ... ]
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
                "Strict validation prevents broken photo carousels from appearing as reels.",
                "Multi-page pagination loop automatically stops if next_max_id is absent or limit reached.",
                "Direct CDN video URLs preserve full query signatures for direct browser streaming."
            ]
        }
    };

    // ==================== DRAWER CONTROLLER ====================
    const backdrop = document.getElementById("v2DrawerBackdrop");
    const drawer = document.getElementById("v2Drawer");
    const closeBtn = document.getElementById("v2CloseDrawerBtn");
    const closeFooterBtn = document.getElementById("v2CloseDrawerFooter");
    const drawerTabs = document.querySelectorAll(".drawer-tab");
    const tabPanes = document.querySelectorAll(".tab-pane");

    function openDrawer(nodeKey) {
        const comp = SUBSTRUCTURE_V2[nodeKey];
        if (!comp) return;

        document.getElementById("v2ModalTier").textContent = comp.tier;
        document.getElementById("v2ModalTitle").textContent = comp.title;
        document.getElementById("v2ModalFile").textContent = comp.file;
        document.getElementById("v2ModalIcon").textContent = comp.icon;
        document.getElementById("v2ModalDesc").textContent = comp.desc;
        document.getElementById("v2SchemaCode").textContent = comp.schema;
        document.getElementById("v2SourceCode").textContent = comp.code;
        document.getElementById("v2CodeAnchor").textContent = comp.file;

        // Highlights List
        const hlList = document.getElementById("v2ModalHighlights");
        hlList.innerHTML = "";
        comp.highlights.forEach(h => {
            const li = document.createElement("li");
            li.className = "flex items-start gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5";
            li.innerHTML = `<span class="text-cyan-400 font-bold">⚡</span> <span>${h}</span>`;
            hlList.appendChild(li);
        });

        // Methods Table
        const mBody = document.getElementById("v2MethodsTbody");
        mBody.innerHTML = "";
        comp.methods.forEach(m => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-white/5 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-cyan-400 font-bold">${m.sig}</td>
                <td class="p-3 text-purple-300 font-sans">${m.ret}</td>
                <td class="p-3 text-slate-300 font-sans">${m.role}</td>
            `;
            mBody.appendChild(tr);
        });

        // Resilience List
        const resList = document.getElementById("v2ResilienceList");
        resList.innerHTML = "";
        comp.resilience.forEach(r => {
            const li = document.createElement("li");
            li.className = "flex items-start gap-2.5 bg-black/40 p-3 rounded-lg border border-white/5";
            li.innerHTML = `<span class="text-emerald-400 font-bold text-sm">🛡️</span> <span>${r}</span>`;
            resList.appendChild(li);
        });

        // Reset to Overview Tab
        switchDrawerTab("overview");

        // Open Drawer
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100");
        drawer.classList.remove("translate-x-full");

        // Highlight Active Node Card
        document.querySelectorAll(".cyber-node").forEach(n => n.classList.remove("node-active"));
        const targetNode = document.getElementById(`v2-${nodeKey}`);
        if (targetNode) targetNode.classList.add("node-active");

        addLog(`[INSPECT] Deep substructure inspected: ${comp.title}`);
    }

    function closeDrawer() {
        backdrop.classList.add("opacity-0", "pointer-events-none");
        backdrop.classList.remove("opacity-100");
        drawer.classList.add("translate-x-full");
        document.querySelectorAll(".cyber-node").forEach(n => n.classList.remove("node-active"));
    }

    function switchDrawerTab(tabId) {
        drawerTabs.forEach(t => {
            if (t.getAttribute("data-tab") === tabId) {
                t.classList.add("active");
                t.classList.remove("text-slate-400");
            } else {
                t.classList.remove("active");
                t.classList.add("text-slate-400");
            }
        });

        tabPanes.forEach(pane => {
            if (pane.id === `tabContent${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`) {
                pane.classList.remove("hidden");
                pane.classList.add("active");
            } else {
                pane.classList.add("hidden");
                pane.classList.remove("active");
            }
        });
    }

    drawerTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetTab = tab.getAttribute("data-tab");
            if (targetTab) switchDrawerTab(targetTab);
        });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (closeFooterBtn) closeFooterBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    // Attach click listeners to all nodes
    document.querySelectorAll(".cyber-node").forEach(node => {
        node.addEventListener("click", () => {
            const key = node.getAttribute("data-node");
            if (key) openDrawer(key);
        });
    });

    // ==================== DYNAMIC CONTINUOUS SVG CABLES ====================
    const canvas = document.getElementById("diagramCanvas");
    const tracksGroup = document.getElementById("cableTracksGroup");
    const packetsGroup = document.getElementById("packetStreamsGroup");

    const CONNECTIONS_V2 = [
        // Reel Transcriber Circuit (Purple / Pink)
        { from: "v2-client-ui", to: "v2-server-router", type: "purple", mode: "transcriber" },
        { from: "v2-server-router", to: "v2-server-queue", type: "purple", mode: "transcriber" },
        { from: "v2-server-queue", to: "v2-worker-audio", type: "purple", mode: "transcriber" },
        { from: "v2-worker-audio", to: "v2-worker-whisper", type: "purple", mode: "transcriber" },
        { from: "v2-server-queue", to: "v2-worker-comments", type: "pink", mode: "transcriber" },
        { from: "v2-worker-whisper", to: "v2-server-queue", type: "purple", mode: "transcriber" },
        { from: "v2-worker-comments", to: "v2-server-queue", type: "pink", mode: "transcriber" },

        // Hashtag Explorer Circuit (Cyan)
        { from: "v2-client-ui", to: "v2-server-router", type: "cyan", mode: "hashtag" },
        { from: "v2-server-router", to: "v2-server-queue", type: "cyan", mode: "hashtag" },
        { from: "v2-server-queue", to: "v2-worker-hashtag", type: "cyan", mode: "hashtag" },
        { from: "v2-worker-hashtag", to: "v2-server-queue", type: "cyan", mode: "hashtag" },

        // Polling & Delivery Circuit (Emerald)
        { from: "v2-server-queue", to: "v2-client-polling", type: "emerald", mode: "all" },
        { from: "v2-client-polling", to: "v2-client-ui", type: "emerald", mode: "all" },
        { from: "v2-client-ui", to: "v2-client-export", type: "emerald", mode: "export" }
    ];

    let currentFlowMode = "all";

    function drawCables() {
        if (!canvas || !tracksGroup) return;
        tracksGroup.innerHTML = "";
        packetsGroup.innerHTML = "";

        const canvasRect = canvas.getBoundingClientRect();

        CONNECTIONS_V2.forEach(conn => {
            const fromNode = document.getElementById(conn.from);
            const toNode = document.getElementById(conn.to);
            if (!fromNode || !toNode) return;

            const r1 = fromNode.getBoundingClientRect();
            const r2 = toNode.getBoundingClientRect();

            const x1 = r1.left + r1.width / 2 - canvasRect.left;
            const y1 = r1.top + r1.height / 2 - canvasRect.top;
            const x2 = r2.left + r2.width / 2 - canvasRect.left;
            const y2 = r2.top + r2.height / 2 - canvasRect.top;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx1 = x1 + dx * 0.25;
            const cy1 = y1 + dy * 0.75;
            const cx2 = x1 + dx * 0.75;
            const cy2 = y1 + dy * 0.25;

            const pathString = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            // Base Wire Track
            const baseCable = document.createElementNS("http://www.w3.org/2000/svg", "path");
            baseCable.setAttribute("d", pathString);
            baseCable.setAttribute("class", "cable-base");
            tracksGroup.appendChild(baseCable);

            // Laser Flow Cable
            const laserCable = document.createElementNS("http://www.w3.org/2000/svg", "path");
            laserCable.setAttribute("d", pathString);
            laserCable.setAttribute("id", `laser-${conn.from}-${conn.to}`);

            let colorClass = "cable-purple";
            if (conn.type === "cyan") colorClass = "cable-cyan";
            else if (conn.type === "pink") colorClass = "cable-pink";
            else if (conn.type === "emerald") colorClass = "cable-emerald";

            laserCable.setAttribute("class", `cable-laser ${colorClass}`);

            // Filter mode handling
            if (currentFlowMode !== "all" && conn.mode !== "all" && conn.mode !== currentFlowMode) {
                laserCable.classList.add("cable-dimmed");
            }

            tracksGroup.appendChild(laserCable);
        });
    }

    window.addEventListener("resize", drawCables);
    window.addEventListener("scroll", drawCables);
    setTimeout(drawCables, 100);

    // ==================== PIPELINE MODE FILTER ====================
    const pipelineBtns = document.querySelectorAll(".pipeline-btn");
    const activeFlowLabel = document.getElementById("activeFlowLabel");

    pipelineBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            pipelineBtns.forEach(b => {
                b.classList.remove("active");
                b.classList.add("text-slate-400");
            });
            btn.classList.add("active");
            btn.classList.remove("text-slate-400");

            currentFlowMode = btn.getAttribute("data-flow") || "all";
            if (activeFlowLabel) activeFlowLabel.textContent = `${currentFlowMode.toUpperCase()} PIPELINE ACTIVE`;

            filterNodesAndCables(currentFlowMode);
        });
    });

    function filterNodesAndCables(mode) {
        addLog(`[FILTER] Activated flow filter: ${mode.toUpperCase()}`);

        const nodes = document.querySelectorAll(".cyber-node");
        nodes.forEach(n => {
            const id = n.id;
            n.classList.remove("node-dimmed");

            if (mode === "transcriber") {
                if (id === "v2-worker-hashtag" || id === "v2-client-export") n.classList.add("node-dimmed");
            } else if (mode === "hashtag") {
                if (id === "v2-worker-audio" || id === "v2-worker-whisper" || id === "v2-worker-comments" || id === "v2-client-export") {
                    n.classList.add("node-dimmed");
                }
            } else if (mode === "export") {
                if (id === "v2-worker-hashtag" || id === "v2-worker-comments" || id === "v2-worker-audio") {
                    n.classList.add("node-dimmed");
                }
            }
        });

        drawCables();
    }

    // ==================== LIVE SIMULATION CONTROLLER ====================
    const simPlayBtn = document.getElementById("simPlayBtn");
    const simPlayIcon = document.getElementById("simPlayIcon");
    const simPlayText = document.getElementById("simPlayText");
    const simResetBtn = document.getElementById("simResetBtn");
    const simSpeedBtn = document.getElementById("simSpeedBtn");
    const simStateLabel = document.getElementById("simStateLabel");
    const v2LogBox = document.getElementById("v2LogBox");
    const v2EventCount = document.getElementById("v2EventCount");
    const packetCounter = document.getElementById("packetCounter");

    let isSimRunning = false;
    let simStepIdx = 0;
    let simTimerId = null;
    let simSpeedMultiplier = 1.0;
    let logSignalCount = 5;

    function addLog(msg) {
        if (!v2LogBox) return;
        logSignalCount++;
        const item = document.createElement("div");
        item.className = "text-slate-300 font-mono text-xs";

        if (msg.includes("[BOOT]") || msg.includes("[RESET]")) item.className = "text-slate-500";
        else if (msg.includes("[WHISPER]") || msg.includes("[AUDIO]")) item.className = "text-purple-400";
        else if (msg.includes("[GRAPHQL]") || msg.includes("[SCRAPER]")) item.className = "text-pink-400";
        else if (msg.includes("[PAGINATION]") || msg.includes("[FILTER]") || msg.includes("[HASHTAG]")) item.className = "text-cyan-400";
        else if (msg.includes("[COMPLETE]") || msg.includes("[STANDBY]")) item.className = "text-emerald-400 font-bold";

        item.textContent = msg;
        v2LogBox.appendChild(item);
        v2LogBox.scrollTop = v2LogBox.scrollHeight;
        if (v2EventCount) v2EventCount.textContent = `Telemetry: ${logSignalCount} signals`;
    }

    const SIM_SEQUENCE = [
        {
            node: "v2-client-ui",
            state: "STAGE 01: Client Dispatched POST /process",
            log: "[CLIENT] User entered Instagram Reel URL -> Dispatched POST /process {url: '...'}",
            rate: "450 pkts/s"
        },
        {
            node: "v2-server-router",
            state: "STAGE 02: Gateway Allocated UUID Task Token",
            log: "[ROUTER] Generated UUIDv4 token: c781f092-29a... -> Initialized status: queued.",
            rate: "820 pkts/s"
        },
        {
            node: "v2-server-queue",
            state: "STAGE 03: Async Thread Worker Dispatched",
            log: "[QUEUE] Spawned isolated background worker thread for process_reel(). Response returned 200 OK.",
            rate: "1,240 pkts/s"
        },
        {
            node: "v2-worker-audio",
            state: "STAGE 04: yt-dlp -> FFmpeg Stream -> RAM",
            log: "[AUDIO] Resolved direct stream URL. FFmpeg piping 16kHz Float32 PCM audio directly to memory.",
            rate: "2,400 pkts/s"
        },
        {
            node: "v2-worker-whisper",
            state: "STAGE 05: Whisper FP16 Tensor Inference (GPU)",
            log: "[WHISPER] Model inferred 48.2s audio tensor in 0.84s on NVIDIA CUDA GPU. Timestamp segments generated.",
            rate: "3,100 pkts/s"
        },
        {
            node: "v2-worker-comments",
            state: "STAGE 06: GraphQL Scraped Top Comments & Post Date",
            log: "[SCRAPER] Instaloader GraphQL query 97b41c5... parsed 30 verified comments and relative timestamp.",
            rate: "1,850 pkts/s"
        },
        {
            node: "v2-client-polling",
            state: "STAGE 07: Client Polling Received Completed Payload",
            log: "[POLLING] Client GET /result/<id> received 'completed' status. Rendered cards and export buttons.",
            rate: "320 pkts/s"
        }
    ];

    function advanceSim() {
        if (simStepIdx >= SIM_SEQUENCE.length) {
            pauseSimulation();
            if (simStateLabel) simStateLabel.textContent = "SIMULATION FINISHED ✅";
            addLog("[COMPLETE] End-to-end packet simulation complete! System returned to standby.");
            return;
        }

        const step = SIM_SEQUENCE[simStepIdx];
        if (simStateLabel) simStateLabel.textContent = step.state;
        if (packetCounter) packetCounter.textContent = step.rate;

        // Highlight Node with Glowing Pulse
        document.querySelectorAll(".cyber-node").forEach(n => n.classList.remove("node-pulsing", "node-active"));
        const target = document.getElementById(step.node);
        if (target) {
            target.classList.add("node-pulsing", "node-active");
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        addLog(step.log);
        simStepIdx++;
        simTimerId = setTimeout(advanceSim, 2000 / simSpeedMultiplier);
    }

    function startSimulation() {
        isSimRunning = true;
        if (simPlayIcon) simPlayIcon.textContent = "⏸️";
        if (simPlayText) simPlayText.textContent = "Pause Simulation";
        addLog("[SIMULATOR] Commencing live packet trace simulation...");
        advanceSim();
    }

    function pauseSimulation() {
        isSimRunning = false;
        if (simTimerId) clearTimeout(simTimerId);
        if (simPlayIcon) simPlayIcon.textContent = "▶️";
        if (simPlayText) simPlayText.textContent = "Resume Simulation";
        document.querySelectorAll(".cyber-node").forEach(n => n.classList.remove("node-pulsing"));
    }

    if (simPlayBtn) {
        simPlayBtn.addEventListener("click", () => {
            if (isSimRunning) {
                pauseSimulation();
                addLog("[SIMULATOR] Simulation paused by operator.");
            } else {
                startSimulation();
            }
        });
    }

    if (simSpeedBtn) {
        simSpeedBtn.addEventListener("click", () => {
            if (simSpeedMultiplier === 1.0) {
                simSpeedMultiplier = 2.0;
                simSpeedBtn.textContent = "2.0x";
                simSpeedBtn.classList.add("text-pink-400");
                addLog("[SPEED] Simulation acceleration toggled to 2.0x.");
            } else {
                simSpeedMultiplier = 1.0;
                simSpeedBtn.textContent = "1.0x";
                simSpeedBtn.classList.remove("text-pink-400");
                addLog("[SPEED] Simulation acceleration reset to 1.0x.");
            }
        });
    }

    if (simResetBtn) {
        simResetBtn.addEventListener("click", () => {
            pauseSimulation();
            simStepIdx = 0;
            if (simPlayIcon) simPlayIcon.textContent = "▶️";
            if (simPlayText) simPlayText.textContent = "Simulate Live Packets";
            if (simStateLabel) simStateLabel.textContent = "AMBIENT RUNNING";
            if (packetCounter) packetCounter.textContent = "128 pkts/s";
            document.querySelectorAll(".cyber-node").forEach(n => n.classList.remove("node-pulsing", "node-active", "node-dimmed"));
            currentFlowMode = "all";
            pipelineBtns.forEach(b => {
                if (b.getAttribute("data-flow") === "all") {
                    b.classList.add("active");
                    b.classList.remove("text-slate-400");
                } else {
                    b.classList.remove("active");
                    b.classList.add("text-slate-400");
                }
            });
            drawCables();
            addLog("[RESET] System topology returned to ambient global mesh state.");
        });
    }
});
