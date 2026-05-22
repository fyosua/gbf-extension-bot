// Read state from sessionStorage on load so it survives GBF's hard page reloads
let isRunning = sessionStorage.getItem('gbf_isRunning') === 'true';
let buffsCheckedThisSession = sessionStorage.getItem('gbf_buffsChecked') === 'true'; 
let currentRoutine = sessionStorage.getItem('gbf_routine') || '';

// The heartbeat timer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sends logs to your Side Panel
function uiLog(message) {
    chrome.runtime.sendMessage({ type: "UI_LOG", text: message }).catch(() => {});
}

// Auto-resume if the page just hard-reloaded while the engine was active
if (isRunning) {
    setTimeout(() => {
        uiLog(">> 🔄 Page reloaded. Restoring engine state...");
        if (currentRoutine === "slime") farmSlimeRoutine();
        else if (currentRoutine === "buff") dailyBuffRoutine();
    }, 1000); // Brief delay to let the DOM settle after a reload
}

// Fluid clicker: Returns true if clicked, false if not found or hidden
async function gameClick(selector) {
    const element = document.querySelector(selector);
    
    if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            uiLog(`✅ Clicked: ${selector}`);
            return true;
        }
    }
    return false; 
}

// --- BUFF ROUTINE ---
async function dailyBuffRoutine() {
    uiLog(">> 🎁 Starting Daily Buff Checker...");
    const startingURL = window.location.hash; 
    
    window.location.hash = "shop/exchange/trajectory";
    await sleep(2000); 

    const effectElem = document.querySelector("div.txt-effect-num");
    
    if (effectElem && effectElem.textContent.includes("0/3")) {
        uiLog(">> Buffs are at 0/3! Activating...");
        
        await gameClick('[data-support-id="1"]'); await sleep(500);
        await gameClick('[data-list-key="4"]'); await sleep(500);
        await gameClick('.btn-usual-ok'); await sleep(500);
        await gameClick('[data-support-id="2"]'); await sleep(500);
        await gameClick('[data-list-key="4"]'); await sleep(500);
        await gameClick('.btn-usual-ok'); await sleep(500);

        uiLog(">> 🎁 Buffs activated successfully!");
    } else {
        uiLog(">> Buffs already active. Skipping.");
    }

    uiLog("Navigating back to original quest page...");
    window.location.hash = startingURL;
    await sleep(2000); 
    uiLog(">> 🛑 Buff Check Complete.");
}


// --- FLUID STATE-MACHINE SLIME ROUTINE ---
async function farmSlimeRoutine() {
    uiLog(">> 🗡️ Slime Farmer Engine Started!");
    
    if (!buffsCheckedThisSession) {
        uiLog(">> First run detected. Initiating Pre-Grind Buff Check...");
        await dailyBuffRoutine(); 
        buffsCheckedThisSession = true; 
        sessionStorage.setItem('gbf_buffsChecked', 'true'); // Save to memory
    }

    if (!window.location.hash.includes("quest/supporter/400181/4")) {
        uiLog(">> Navigating to Slime Quest...");
        window.location.hash = "quest/supporter/400181/4";
        await sleep(1000);
    }

    // THE HEARTBEAT LOOP
    while (isRunning) {
        await sleep(1000);
        if (!isRunning) break;

        const currentHash = window.location.hash;

        // --- STATE A: Supporter Page ---
        if (currentHash.includes("quest/supporter/400181")) {
            const startBtn = document.querySelector(".se-quest-start");
            
            if (startBtn && startBtn.getBoundingClientRect().width > 0 && !startBtn.classList.contains('disable')) {
                await gameClick(".se-quest-start");
                uiLog("[State A] Party confirmed. Starting quest...");
                await sleep(500); 
                const okBtn = document.querySelector(".btn-usual-ok");
                if(okBtn && okBtn.style.display === 'block'){
                    await gameClick(".btn-usual-ok");
                    continue;
                }
                continue;
            }
        }
        
        // --- STATE B: Raid Page ---
        else if (currentHash.includes("raid/")) {

            const nextBtn = document.querySelector(".prt-command-end");
            if(nextBtn && nextBtn.style.display === 'block'){
                await gameClick(".btn-result");
                continue; 
            }

            const attackBtn = document.querySelector(".btn-attack-start");
            if (attackBtn && attackBtn.getBoundingClientRect().width > 0) {
                uiLog("[State B] Battle Loaded. Engaging Auto...");
                await gameClick(".btn-attack-start");
                await sleep(1800); 
                await gameClick(".btn-auto");
                await sleep(500); 
                continue; 
            }
        }
        
        // --- STATE C: Result Page ---
        else if (currentHash.includes("result/")) { 
            uiLog("[State C] Result Clearing...");
            let madeAnAction = false; 

            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult){
                madeAnAction = true;
            }

            if (document.querySelector("#cjs-lp-rankup")) {
                await gameClick("#cjs-lp-rankup");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedOk = await gameClick(".btn-usual-ok");
            if (clickedOk) {
                await sleep(500);
                madeAnAction = true;
            }

            const clickedRetry = await gameClick(".btn-retry.cnt-quest");
            if (clickedRetry) {
                uiLog("[State C] Clicking Play Again...");
                await sleep(500); 
                madeAnAction = true;
            }

            if (madeAnAction) {
                continue; 
            }
        }
    }
    
    uiLog(">> 🛑 Engine Stopped Safely.");
}

// --- EXTENSION MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "start") {
        if (!isRunning) {
            isRunning = true;
            currentRoutine = request.routine;
            
            // Save state to sessionStorage
            sessionStorage.setItem('gbf_isRunning', 'true');
            sessionStorage.setItem('gbf_routine', request.routine);
            
            if (request.routine === "slime") farmSlimeRoutine();
            else if (request.routine === "buff") dailyBuffRoutine();
        }
        sendResponse({ status: "started" });
    } else if (request.command === "stop") {
        isRunning = false;
        
        // 🛠️ FIX: Fully wipe the engine state when manually stopped
        sessionStorage.setItem('gbf_isRunning', 'false'); 
        sessionStorage.setItem('gbf_buffsChecked', 'false'); 
        buffsCheckedThisSession = false; 
        
        uiLog(">> Stop command received. Halting...");
        sendResponse({ status: "stopped" });
    } else if (request.command === "getStatus") {
        sendResponse({ isRunning: isRunning });
    }
    return true; 
});