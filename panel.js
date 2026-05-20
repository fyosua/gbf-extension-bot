const logBox = document.getElementById('statusLog');
const btn = document.getElementById('startBtn');

function writeLog(text) {
    logBox.innerText += `\n${text}`;
    logBox.scrollTop = logBox.scrollHeight;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UI_LOG") {
        writeLog(message.text);
    }
});

// 🛠️ NEW: Safely scans the current window to find your active Granblue tab
async function getGBFTab() {
    let tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.find(t => t.active && t.url && (t.url.includes("granbluefantasy") || t.url.includes("mbga")));
}

document.addEventListener('DOMContentLoaded', async () => {
    let tab = await getGBFTab();

    if (!tab) {
        writeLog(">> ❌ Error: Open Granblue tab first!");
        btn.disabled = true;
        return;
    }

    // 🛠️ FIX 2: Added .catch(() => {}) to swallow the panel.html:0 error
    chrome.tabs.sendMessage(tab.id, { command: "getStatus" }).then((response) => {
        if (response && response.isRunning) {
            btn.innerText = "Stop Engine";
            btn.style.color = "red";
            btn.style.borderColor = "red";
            writeLog(">> Reconnected to running engine...");
        }
    }).catch(() => {}); 
});

btn.addEventListener('click', async () => {
    const routine = document.getElementById('routineSelect').value;
    let tab = await getGBFTab();

    if (!tab) return;

    if (btn.innerText === "Start Engine") {
        btn.innerText = "Stop Engine";
        btn.style.color = "red";
        btn.style.borderColor = "red";
        
        writeLog(`>> Starting ${routine} routine...`);
        chrome.tabs.sendMessage(tab.id, { command: "start", routine: routine }).catch(() => {});
    } else {
        btn.innerText = "Start Engine";
        btn.style.color = "#0f0";
        btn.style.borderColor = "#0f0";
        
        chrome.tabs.sendMessage(tab.id, { command: "stop" }).catch(() => {});
    }
});