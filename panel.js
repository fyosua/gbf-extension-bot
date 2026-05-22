const logBox = document.getElementById('statusLog');
const btn = document.getElementById('startBtn');
const routineSelect = document.getElementById('routineSelect');
const slotConfigContainer = document.getElementById('slotConfigContainer');

// --- 1. MEMORY-SAFE UI LOGGER ---
function writeLog(text) {
    const logLine = document.createElement('div');
    logLine.textContent = text;
    logBox.appendChild(logLine);

    // Keep only the last 100 logs in memory to prevent RAM leaks
    while (logBox.children.length > 100) {
        logBox.removeChild(logBox.firstChild);
    }
    logBox.scrollTop = logBox.scrollHeight;
}

// --- 2. ENGINE MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UI_LOG") {
        writeLog(message.text);
    } 
    else if (message.type === "STATUS_UPDATE" && message.state === "IDLE") {
        btn.innerText = "Start Engine";
        btn.style.color = "#0f0";
        btn.style.borderColor = "#0f0";
    }
});

// --- 3. DYNAMIC UI LISTENER FOR CONFIGS ---
routineSelect.addEventListener('change', (event) => {
    if (event.target.value === "raidSearch") {
        slotConfigContainer.style.display = "block"; // Show it
    } else {
        slotConfigContainer.style.display = "none";  // Hide it
    }
});

// Safely scans the current window to find your active Granblue tab
async function getGBFTab() {
    let tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.find(t => t.active && t.url && (t.url.includes("granbluefantasy") || t.url.includes("mbga")));
}

// --- 4. INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', async () => {
    let tab = await getGBFTab();

    if (!tab) {
        writeLog(">> ❌ Error: Open Granblue tab first!");
        btn.disabled = true;
        return;
    }

    // Check if the engine is already running when we open the panel
    chrome.tabs.sendMessage(tab.id, { command: "getStatus" }).then((response) => {
        if (response && response.isRunning) {
            btn.innerText = "Stop Engine";
            btn.style.color = "red";
            btn.style.borderColor = "red";
            
            // Sync the dropdown visibility
            if (response.currentRoutine === "raidSearch") {
                slotConfigContainer.style.display = "block";
            }
            writeLog(">> Reconnected to running engine...");
        }
    }).catch(() => {}); 
});

// --- 5. START/STOP BUTTON LOGIC ---
btn.addEventListener('click', async () => {
    const routine = routineSelect.value;
    const targetSlot = document.getElementById('slotSelect').value; 
    const targetWaitTime = document.getElementById('waitTimeInput').value; // 🛠️ Grab the wait time
    
    let tab = await getGBFTab();

    if (!tab) return;

    if (btn.innerText === "Start Engine") {
        btn.innerText = "Stop Engine";
        btn.style.color = "red";
        btn.style.borderColor = "red";
        
        if (routine === "raidSearch") {
            writeLog(`>> Starting ${routine} (Slot ${targetSlot}, ${targetWaitTime}s wait)...`);
        } else {
            writeLog(`>> Starting ${routine} routine...`);
        }
        
        // Pass the payload to the engine
        chrome.tabs.sendMessage(tab.id, { 
            command: "start", 
            routine: routine,
            searchSlot: targetSlot,
            waitTime: targetWaitTime // 🛠️ Send to content.js
        }).catch(() => {});
    } else {
        btn.innerText = "Start Engine";
        btn.style.color = "#0f0";
        btn.style.borderColor = "#0f0";
        
        chrome.tabs.sendMessage(tab.id, { command: "stop" }).catch(() => {});
    }
});