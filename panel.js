// --- panel.js (The UI Communicator) ---

const logBox = document.getElementById('statusLog');
const btn = document.getElementById('startBtn');
const routineSelect = document.getElementById('routineSelect');

// UI Containers for dynamic configs
const slotConfigContainer = document.getElementById('slotConfigContainer');
const slimeConfigContainer = document.getElementById('slimeConfigContainer'); 
const eventConfigContainer = document.getElementById('eventConfigContainer'); 

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
    const selected = event.target.value;
    
    // Toggle containers based on the active routine
    slotConfigContainer.style.display = selected === "raidSearch" ? "block" : "none";
    slimeConfigContainer.style.display = selected === "slime" ? "block" : "none"; 
    eventConfigContainer.style.display = selected === "eventRun" ? "block" : "none"; 
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

    // Trigger the change event to set the initial UI state
    routineSelect.dispatchEvent(new Event('change'));

    // Check if the engine is already running when we open the panel
    chrome.tabs.sendMessage(tab.id, { command: "getStatus" }).then((response) => {
        if (response && response.isRunning) {
            btn.innerText = "Stop Engine";
            btn.style.color = "red";
            btn.style.borderColor = "red";
            
            routineSelect.value = response.currentRoutine;
            routineSelect.dispatchEvent(new Event('change')); 
            
            writeLog(">> Reconnected to running engine...");
        }
    }).catch(() => {}); 
});

// --- 5. START/STOP BUTTON LOGIC ---
btn.addEventListener('click', async () => {
    // 🛠️ Grab ALL values from the UI inputs
    const routine = routineSelect.value;
    const targetSlot = document.getElementById('slotSelect').value; 
    const targetWaitTime = document.getElementById('waitTimeInput').value; 
    const targetSlimeId = document.getElementById('slimeIdInput').value || '400181/4'; 
    const targetEventId = document.getElementById('eventIdInput').value || '944131/3'; 
    const targetSummonId = document.getElementById('summonIdInput').value || '2040094000_04';
    const targetSummonRank = document.getElementById('summonRankInput').value || '4'; 
    
    let tab = await getGBFTab();

    if (!tab) return;

    if (btn.innerText === "Start Engine") {
        btn.innerText = "Stop Engine";
        btn.style.color = "red";
        btn.style.borderColor = "red";
        
        // Log contextual start messages based on the routine
        if (routine === "raidSearch") {
            writeLog(`>> Starting ${routine} (Slot ${targetSlot}, ${targetWaitTime}s wait)...`);
        } else if (routine === "slime") {
            writeLog(`>> Starting ${routine} (Quest ID: ${targetSlimeId})...`);
        } else if (routine === "eventRun") {
            writeLog(`>> Starting ${routine} (Event: ${targetEventId}, Summon: ${targetSummonId}, Rank: ${targetSummonRank})...`); 
        } else {
            writeLog(`>> Starting ${routine} routine...`);
        }
        
        try {
            // 🛠️ Transmit the massive payload to the engine!
            await chrome.tabs.sendMessage(tab.id, { 
                command: "start", 
                routine: routine,
                searchSlot: targetSlot,
                waitTime: targetWaitTime,
                slimeId: targetSlimeId, 
                eventId: targetEventId,
                summonId: targetSummonId,
                summonRank: targetSummonRank 
            });

            if (chrome.runtime.lastError) {
                writeLog(">> ❌ Error: Content script not found. Please hard-refresh (F5) the game tab.");
                resetUI();
            }
        } catch (error) {
            writeLog(">> ❌ Communication error. Is the game tab fully loaded?");
            resetUI();
        }

    } else {
        resetUI();
        chrome.tabs.sendMessage(tab.id, { command: "stop" }).catch(() => {});
    }
});

function resetUI() {
    btn.innerText = "Start Engine";
    btn.style.color = "#0f0";
    btn.style.borderColor = "#0f0";
}