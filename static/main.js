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
});
