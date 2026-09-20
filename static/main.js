document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("processForm");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");
    const spinner = document.getElementById("loadingSpinner");
    const statusMessage = document.getElementById("statusMessage");
    const resultsSection = document.getElementById("resultsSection");
    const transcriptBox = document.getElementById("transcriptBox");
    const commentsBox = document.getElementById("commentsBox");
    
    // Download buttons
    const downloadTxt = document.getElementById("downloadTxt");
    const downloadPdf = document.getElementById("downloadPdf");
    const downloadSrt = document.getElementById("downloadSrt");

    let currentTaskId = null;
    let pollInterval = null;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const urlInput = document.getElementById("urlInput").value.trim();
        if(!urlInput) return;

        // Reset UI
        resultsSection.classList.add("hidden");
        transcriptBox.innerHTML = "";
        commentsBox.innerHTML = "";
        
        // Set loading state
        setLoading(true);
        statusMessage.textContent = "Initializing pipeline...";

        try {
            const response = await fetch("/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlInput })
            });
            
            const data = await response.json();
            if(data.error) throw new Error(data.error);
            
            currentTaskId = data.task_id;
            
            // Start polling
            pollInterval = setInterval(pollResult, 2000);
            
        } catch(error) {
            setLoading(false);
            statusMessage.textContent = `Error: ${error.message}`;
        }
    });

    async function pollResult() {
        if(!currentTaskId) return;

        try {
            const response = await fetch(`/result/${currentTaskId}`);
            const data = await response.json();
            
            if (data.status === "processing" || data.status === "queued") {
                statusMessage.textContent = data.message || "Processing in background...";
            } 
            else if (data.status === "completed") {
                clearInterval(pollInterval);
                setLoading(false);
                statusMessage.textContent = "Processing complete! ✅";
                displayResults(data);
                
                // Update download links
                downloadTxt.href = `/download/${currentTaskId}/txt`;
                downloadPdf.href = `/download/${currentTaskId}/pdf`;
                downloadSrt.href = `/download/${currentTaskId}/srt`;
                
            } 
            else if (data.status === "error") {
                clearInterval(pollInterval);
                setLoading(false);
                statusMessage.textContent = `Error: ${data.message}`;
            }
        } catch(error) {
            console.error("Polling error:", error);
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function linkifyText(escapedText) {
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
        return escapedText.replace(urlRegex, (url) => {
            const href = url.startsWith("http") ? url : "https://" + url;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-pink-400 hover:text-pink-300 underline underline-offset-2 break-all font-semibold">${url}</a>`;
        });
    }

    function formatNumber(num) {
        if (!num || isNaN(num)) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toLocaleString();
    }

    function displayResults(data) {
        resultsSection.classList.remove("hidden");
        
        // Simple assignment for transcript
        transcriptBox.textContent = data.transcript;
        
        // Build comments list
        commentsBox.innerHTML = "";
        if (data.comments && data.comments.length > 0) {
            data.comments.forEach((comment) => {
                const div = document.createElement("div");
                div.className = "comment-card animate-fade-in";
                
                // If comment is a structured object
                if (typeof comment === "object" && comment !== null) {
                    if (comment.error) {
                        div.innerHTML = `<p class="text-red-400 text-sm flex items-center gap-2">⚠️ ${escapeHtml(comment.message || "Error loading comments")}</p>`;
                        commentsBox.appendChild(div);
                        return;
                    }
                    if (comment.message && !comment.username) {
                        div.innerHTML = `<p class="text-gray-400 text-sm italic">${escapeHtml(comment.message)}</p>`;
                        commentsBox.appendChild(div);
                        return;
                    }

                    const username = comment.username || "anonymous";
                    const text = comment.text || "";
                    const likes = parseInt(comment.likes, 10) || 0;
                    const replies = parseInt(comment.replies, 10) || 0;
                    const links = Array.isArray(comment.links) ? comment.links : [];
                    const isVerified = Boolean(comment.is_verified);
                    const profilePic = comment.profile_pic_url || "";
                    const initial = username.charAt(0).toUpperCase();

                    const formattedLikes = formatNumber(likes);
                    const formattedText = linkifyText(escapeHtml(text));

                    let linksBanner = "";
                    if (links.length > 0) {
                        linksBanner = `
                            <div class="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap gap-2 items-center text-xs">
                                <span class="text-gray-400 flex items-center gap-1">🔗 <strong>${links.length}</strong> link${links.length > 1 ? 's' : ''}:</span>
                                ${links.map(l => {
                                    const cleanUrl = escapeHtml(l);
                                    const targetHref = l.startsWith("http") ? l : "https://" + l;
                                    return `<a href="${targetHref}" target="_blank" rel="noopener noreferrer" class="bg-purple-950/60 hover:bg-purple-900 text-purple-300 hover:text-white px-2 py-1 rounded-md border border-purple-500/30 transition-all truncate max-w-xs">${cleanUrl}</a>`;
                                }).join("")}
                            </div>
                        `;
                    }

                    div.innerHTML = `
                        <div class="flex items-start gap-3.5">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm text-white shadow-md">
                                ${profilePic ? `<img src="${profilePic}" alt="${escapeHtml(username)}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span style="display:none;" class="w-full h-full flex items-center justify-center">${initial}</span>` : `<span>${initial}</span>`}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                    <div class="flex items-center gap-1.5">
                                        <strong class="text-pink-400 font-semibold text-sm hover:underline cursor-pointer">@${escapeHtml(username)}</strong>
                                        ${isVerified ? '<span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-black" title="Verified">✓</span>' : ''}
                                    </div>
                                    <div class="flex items-center gap-2 text-xs flex-wrap">
                                        <span class="bg-pink-500/15 text-pink-300 px-2.5 py-0.5 rounded-full font-semibold border border-pink-500/25 flex items-center gap-1 shadow-sm">
                                            ❤️ ${formattedLikes} ${likes === 1 ? 'like' : 'likes'}
                                        </span>
                                        ${replies > 0 ? `<span class="bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">💬 ${replies}</span>` : ''}
                                        ${links.length > 0 ? `<span class="bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">🔗 ${links.length} link${links.length > 1 ? 's' : ''}</span>` : ''}
                                    </div>
                                </div>
                                <p class="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">${formattedText}</p>
                                ${linksBanner}
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback for plain string
                    const parts = comment.split(": ");
                    const username = parts.shift();
                    const text = parts.join(": ");
                    if (text) {
                        div.innerHTML = `<strong class="text-pink-400">@${escapeHtml(username)}</strong><p class="mt-1 text-gray-300 text-sm whitespace-pre-wrap">${linkifyText(escapeHtml(text))}</p>`;
                    } else {
                        div.innerHTML = `<p class="text-gray-300 text-sm">${escapeHtml(comment)}</p>`;
                    }
                }
                
                commentsBox.appendChild(div);
            });
        } else {
            commentsBox.innerHTML = '<p class="text-gray-500 italic">No comments available.</p>';
        }
    }

    function setLoading(isLoading) {
        if(isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = "Processing...";
            spinner.classList.remove("hidden");
            btnText.classList.add("hidden");
        } else {
            submitBtn.disabled = false;
            btnText.textContent = "Generate";
            spinner.classList.add("hidden");
            btnText.classList.remove("hidden");
        }
    }

    // ==================== TAB SWITCHING LOGIC ====================
    const tabTranscriber = document.getElementById("tabTranscriber");
    const tabHashtag = document.getElementById("tabHashtag");
    const sectionTranscriber = document.getElementById("sectionTranscriber");
    const sectionHashtag = document.getElementById("sectionHashtag");

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
    }

    if (tabTranscriber && tabHashtag) {
        tabTranscriber.addEventListener("click", () => switchTab("transcriber"));
        tabHashtag.addEventListener("click", () => switchTab("hashtag"));
    }

    // ==================== HASHTAG EXPLORER LOGIC ====================
    const hashtagForm = document.getElementById("hashtagForm");
    const tagInput = document.getElementById("tagInput");
    const tagLimit = document.getElementById("tagLimit");
    const hashtagSubmitBtn = document.getElementById("hashtagSubmitBtn");
    const hashtagBtnText = document.getElementById("hashtagBtnText");
    const hashtagLoadingSpinner = document.getElementById("hashtagLoadingSpinner");
    const hashtagStatusMessage = document.getElementById("hashtagStatusMessage");
    const hashtagResultsSection = document.getElementById("hashtagResultsSection");
    const currentTagName = document.getElementById("currentTagName");
    const totalReelsBadge = document.getElementById("totalReelsBadge");
    const hashtagMetaInfo = document.getElementById("hashtagMetaInfo");
    const reelsGrid = document.getElementById("reelsGrid");
    const sortLikedBtn = document.getElementById("sortLikedBtn");
    const sortViewedBtn = document.getElementById("sortViewedBtn");

    let hashtagTaskId = null;
    let hashtagPollInterval = null;
    let currentHashtagData = null;
    let currentSortMode = "liked"; // 'liked' or 'viewed'

    if (hashtagForm) {
        hashtagForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const rawTag = tagInput.value.trim();
            if (!rawTag) return;

            const limit = tagLimit ? parseInt(tagLimit.value, 10) : 50;

            // Reset UI
            hashtagResultsSection.classList.add("hidden");
            reelsGrid.innerHTML = "";
            setHashtagLoading(true);
            hashtagStatusMessage.textContent = `Connecting to Instagram for #${rawTag.replace(/^[#]+/, '')}...`;

            try {
                const response = await fetch("/hashtag", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tag: rawTag, limit: limit })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                hashtagTaskId = data.task_id;
                hashtagPollInterval = setInterval(pollHashtagResult, 2000);
            } catch (err) {
                setHashtagLoading(false);
                hashtagStatusMessage.textContent = `Error: ${err.message}`;
            }
        });
    }

    async function pollHashtagResult() {
        if (!hashtagTaskId) return;

        try {
            const response = await fetch(`/result/${hashtagTaskId}`);
            const data = await response.json();

            if (data.status === "processing" || data.status === "queued") {
                hashtagStatusMessage.textContent = data.message || "Exploring top reels on Instagram...";
            } 
            else if (data.status === "completed") {
                clearInterval(hashtagPollInterval);
                setHashtagLoading(false);
                hashtagStatusMessage.textContent = `Exploration complete! Found ${data.total_reels_found} reels ✅`;
                currentHashtagData = data;
                displayHashtagResults(data);
            } 
            else if (data.status === "error") {
                clearInterval(hashtagPollInterval);
                setHashtagLoading(false);
                hashtagStatusMessage.textContent = `⚠️ ${data.message}`;
            }
        } catch (err) {
            console.error("Hashtag polling error:", err);
        }
    }

    function setHashtagLoading(isLoading) {
        if (isLoading) {
            hashtagSubmitBtn.disabled = true;
            hashtagBtnText.textContent = "Exploring...";
            hashtagLoadingSpinner.classList.remove("hidden");
            hashtagBtnText.classList.add("hidden");
        } else {
            hashtagSubmitBtn.disabled = false;
            hashtagBtnText.textContent = "Explore";
            hashtagLoadingSpinner.classList.add("hidden");
            hashtagBtnText.classList.remove("hidden");
        }
    }

    function formatDuration(sec) {
        if (!sec || isNaN(sec)) return "";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function displayHashtagResults(data) {
        hashtagResultsSection.classList.remove("hidden");

        currentTagName.textContent = `#${data.tag}`;
        totalReelsBadge.textContent = `${data.total_reels_found} Reels Extracted`;
        if (data.media_count) {
            hashtagMetaInfo.textContent = `${formatNumber(data.media_count)} total posts on Instagram`;
        } else {
            hashtagMetaInfo.textContent = `Ranked by likes & views`;
        }

        renderReelsGrid();
    }

    function renderReelsGrid() {
        if (!currentHashtagData) return;

        const reels = currentSortMode === "liked" 
            ? (currentHashtagData.top_liked || []) 
            : (currentHashtagData.top_viewed || []);

        reelsGrid.innerHTML = "";

        if (reels.length === 0) {
            reelsGrid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">No reels found for this sort mode.</div>`;
            return;
        }

        reels.forEach((reel, index) => {
            const card = document.createElement("div");
            card.className = "reel-card animate-fade-in";

            const formattedLikes = formatNumber(reel.likes);
            const formattedViews = formatNumber(reel.views);
            const durationStr = formatDuration(reel.duration);
            const captionEscaped = escapeHtml(reel.caption || "");

            card.innerHTML = `
                <!-- Thumbnail & Badges -->
                <div class="relative w-full aspect-[9/12] bg-gray-800 overflow-hidden group">
                    ${reel.thumbnail ? `
                        <img src="${reel.thumbnail}" alt="@${escapeHtml(reel.owner)}" 
                             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                             onerror="this.src='https://placehold.co/400x600/1f2937/9ca3af?text=Instagram+Reel';">
                    ` : `
                        <div class="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 font-bold">
                            🎬 Instagram Reel
                        </div>
                    `}
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

                    <!-- Top Badges -->
                    <div class="absolute top-3 left-3 flex items-center gap-1.5">
                        <span class="bg-black/70 backdrop-blur-md text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
                            #${index + 1}
                        </span>
                    </div>

                    ${durationStr ? `
                        <div class="absolute top-3 right-3">
                            <span class="bg-black/70 backdrop-blur-md text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-md border border-white/10">
                                ⏱️ ${durationStr}
                            </span>
                        </div>
                    ` : ''}

                    <!-- Stats Overlaid at Bottom of Thumbnail -->
                    <div class="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                        <span class="bg-pink-500/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            ❤️ ${formattedLikes}
                        </span>
                        <span class="bg-purple-600/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            👁️ ${formattedViews}
                        </span>
                    </div>
                </div>

                <!-- Card Content -->
                <div class="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                        <!-- Author -->
                        <div class="flex items-center justify-between mb-2">
                            <a href="https://www.instagram.com/${escapeHtml(reel.owner)}/" target="_blank" rel="noopener noreferrer" 
                               class="text-pink-400 hover:text-pink-300 font-bold text-sm truncate max-w-[200px] flex items-center gap-1">
                                <span>@${escapeHtml(reel.owner)}</span>
                            </a>
                        </div>

                        <!-- Post Description / Caption -->
                        <p class="text-gray-300 text-xs leading-relaxed line-clamp-3" title="${captionEscaped}">
                            ${captionEscaped || '<span class="italic text-gray-500">No caption provided.</span>'}
                        </p>
                    </div>

                    <!-- Direct Action Links -->
                    <div class="pt-3 border-t border-white/5 flex flex-col gap-2">
                        <div class="grid grid-cols-2 gap-2">
                            ${reel.video_url ? `
                                <a href="${reel.video_url}" target="_blank" rel="noopener noreferrer" 
                                   class="bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:border-pink-500/50 text-[11px] font-semibold py-2 px-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1">
                                    <span>🎬</span> Direct Video
                                </a>
                            ` : `
                                <a href="${reel.reel_url}" target="_blank" rel="noopener noreferrer" 
                                   class="bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] font-semibold py-2 px-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1">
                                    <span>🎬</span> Watch Reel
                                </a>
                            `}
                            <a href="${reel.reel_url}" target="_blank" rel="noopener noreferrer" 
                               class="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-[11px] font-semibold py-2 px-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1">
                                <span>↗️</span> Instagram
                            </a>
                        </div>
                        
                        <button type="button" class="btn-quick-transcribe w-full bg-gradient-to-r from-purple-900/40 to-pink-900/40 hover:from-purple-900/60 hover:to-pink-900/60 text-purple-200 border border-purple-500/30 hover:border-purple-400/50 text-[11px] font-semibold py-1.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5"
                                data-url="${reel.reel_url}">
                            <span>🎙️</span> Transcribe & Scrape Comments
                        </button>
                    </div>
                </div>
            `;

            // Setup quick transcribe button
            const transcribeBtn = card.querySelector(".btn-quick-transcribe");
            if (transcribeBtn) {
                transcribeBtn.addEventListener("click", () => {
                    const url = transcribeBtn.getAttribute("data-url");
                    if (url) {
                        switchTab("transcriber");
                        const urlInputEl = document.getElementById("urlInput");
                        if (urlInputEl) {
                            urlInputEl.value = url;
                            urlInputEl.focus();
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            }

            reelsGrid.appendChild(card);
        });
    }

    // Sort button listeners
    if (sortLikedBtn && sortViewedBtn) {
        sortLikedBtn.addEventListener("click", () => {
            currentSortMode = "liked";
            sortLikedBtn.classList.add("active");
            sortLikedBtn.classList.remove("text-gray-400");
            sortViewedBtn.classList.remove("active");
            sortViewedBtn.classList.add("text-gray-400");
            renderReelsGrid();
        });

        sortViewedBtn.addEventListener("click", () => {
            currentSortMode = "viewed";
            sortViewedBtn.classList.add("active");
            sortViewedBtn.classList.remove("text-gray-400");
            sortLikedBtn.classList.remove("active");
            sortLikedBtn.classList.add("text-gray-400");
            renderReelsGrid();
        });
    }
});

