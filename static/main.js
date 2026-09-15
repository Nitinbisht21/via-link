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

    function displayResults(data) {
        resultsSection.classList.remove("hidden");
        
        // Simple assignment for transcript
        transcriptBox.textContent = data.transcript;
        
        // Build comments list
        commentsBox.innerHTML = "";
        if (data.comments && data.comments.length > 0) {
            data.comments.forEach((comment) => {
                const parts = comment.split(": ");
                const username = parts.shift(); // First part is username
                const text = parts.join(": ");  // Rest is comment
                
                const div = document.createElement("div");
                div.className = "comment-card animate-fade-in";
                
                // If it split correctly, format nicely, else just dump string
                if(text) {
                    div.innerHTML = `<strong class="text-pink-400">@${username}</strong><p class="mt-1 text-gray-300 text-sm">${text}</p>`;
                } else {
                    div.innerHTML = `<p class="text-gray-300 text-sm">${comment}</p>`;
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
