const logBox = document.getElementById('statusLog');
const btn = document.getElementById('startBtn');
const routineSelect = document.getElementById('routineSelect');
const slotConfigContainer = document.getElementById('slotConfigContainer');
const slimeConfigContainer = document.getElementById('slimeConfigContainer'); // 🛠️ NEW UI Element

// --- 1. MEMORY-SAFE UI LOGGER ---
function writeLog(text) {
    const logLine = document.createElement('div');
    logLine.textContent = text;
    logBox.appendChild(logLine);

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
    const selected = event.target.value;
    slotConfigContainer.style.display = selected === "raidSearch" ? "block" : "none";
    slimeConfigContainer.style.display = selected === "slime" ? "block" : "none"; // 🛠️ Toggle Slime UI
});

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

    // Trigger UI toggle on initial load so it matches the default dropdown value
    routineSelect.dispatchEvent(new Event('change'));

    chrome.tabs.sendMessage(tab.id, { command: "getStatus" }).then((response) => {
        if (response && response.isRunning) {
            btn.innerText = "Stop Engine";
            btn.style.color = "red";
            btn.style.borderColor = "red";
            
            routineSelect.value = response.currentRoutine;
            routineSelect.dispatchEvent(new Event('change')); // Sync UI
            
            writeLog(">> Reconnected to running engine...");
        }
    }).catch(() => {}); 
});

// --- 5. START/STOP BUTTON LOGIC ---
btn.addEventListener('click', async () => {
    const routine = routineSelect.value;
    const targetSlot = document.getElementById('slotSelect').value; 
    const targetWaitTime = document.getElementById('waitTimeInput').value; 
    const targetSlimeId = document.getElementById('slimeIdInput').value || '400181/4'; // 🛠️ Grab Slime ID
    
    let tab = await getGBFTab();

    if (!tab) return;

    if (btn.innerText === "Start Engine") {
        btn.innerText = "Stop Engine";
        btn.style.color = "red";
        btn.style.borderColor = "red";
        
        if (routine === "raidSearch") {
            writeLog(`>> Starting ${routine} (Slot ${targetSlot}, ${targetWaitTime}s wait)...`);
        } else if (routine === "slime") {
            writeLog(`>> Starting ${routine} (Quest ID: ${targetSlimeId})...`);
        } else {
            writeLog(`>> Starting ${routine} routine...`);
        }
        
        try {
            await chrome.tabs.sendMessage(tab.id, { 
                command: "start", 
                routine: routine,
                searchSlot: targetSlot,
                waitTime: targetWaitTime,
                slimeId: targetSlimeId // 🛠️ Send to content.js
            });

            if (chrome.runtime.lastError) {
                writeLog(">> ❌ Error: Content script not found. Please hard-refresh (F5) the game tab.");
                btn.innerText = "Start Engine";
                btn.style.color = "#0f0";
                btn.style.borderColor = "#0f0";
            }
        } catch (error) {
            writeLog(">> ❌ Communication error. Is the game tab fully loaded?");
            btn.innerText = "Start Engine";
            btn.style.color = "#0f0";
            btn.style.borderColor = "#0f0";
        }

    } else {
        btn.innerText = "Start Engine";
        btn.style.color = "#0f0";
        btn.style.borderColor = "#0f0";
        
        chrome.tabs.sendMessage(tab.id, { command: "stop" }).catch(() => {});
    }
});