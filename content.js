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
        else if (currentRoutine === "dailyRaid") dailyRaidSkip();
    }, 1000); // Brief delay to let the DOM settle after a reload
}

// 🛠️ UPDATED: Fluid clicker now accepts a 'force' parameter to bypass visibility checks
async function gameClick(selector, force = false) {
    const element = document.querySelector(selector);
    
    if (element) {
        const rect = element.getBoundingClientRect();
        
        // If force is true, we ignore rect.width > 0 (clicks hidden/unrendered elements)
        if (force || (rect.width > 0 && rect.height > 0)) {
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
                gameClick(".btn-control.location-href");
                madeAnAction = true;
            }

            if (document.querySelector("#cjs-lp-rankup")) {
                await gameClick("#cjs-lp-rankup");
                uiLog("[State C] Cleared Rank Up.");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedOk = await gameClick(".btn-usual-ok");
            if (clickedOk) {
                uiLog("[State C] Clicking OK...");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedClose = await gameClick(".btn-usual-close");
            if (clickedClose) {
                uiLog("[State C] Closing Results...");
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

// --- DAILY RAID SKIP ROUTINE ---
async function dailyRaidSkip() {
    uiLog(">> ⏩ Starting Daily Raid Skip...");

    // 1. 🛠️ NEW: Pre-Grind Buff Check (Runs only once per session)
    if (!buffsCheckedThisSession) {
        uiLog(">> First run detected. Initiating Pre-Grind Buff Check...");
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'BUFF_CHECK' }).catch(() => {});
        
        await dailyBuffRoutine(); 
        
        buffsCheckedThisSession = true; 
        sessionStorage.setItem('gbf_buffsChecked', 'true'); // Save to memory
    }

    if (!window.location.hash.includes("quest/multi/0")) {
        uiLog(">> Navigating to Daily Raid Quest...");
        window.location.hash = "quest/multi/0";
        await sleep(1000);
    }

    let failSafeClicked = 0;

    // THE HEARTBEAT LOOP
    while (isRunning) {
        uiLog(">> Checking Daily Raid Quest...");
        await sleep(1000);
        if (!isRunning) break;

        const currentHash = window.location.hash;

        // --- STATE A: Quest Selection List ---
        if (currentHash.includes("quest/multi/0")) {
            // Broadcast state to UI
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'QUEST_SELECT' }).catch(() => {});
            
            // Open the Pro List menu if it exists
            const proListBtn = document.querySelector(".btn-pro-list");
            if (proListBtn) {
                await gameClick(".btn-pro-list");
            }

            // --- DYNAMIC PRO SKIP CHECKER ---
            const proSkips = [
                { id: "305261", name: "Hard+ Pro" },
                { id: "305441", name: "Omega Pro" },
                { id: "305471", name: "Primal Legend Pro" },
                { id: "305651", name: "Primarch Test Pro" },
                { id: "305461", name: "Omega (Impossible) Pro" },
                { id: "305561", name: "Regalia Pro" },
                { id: "103951", name: "Showdown Pro" },
                { id: "103991", name: "Clash Pro" },
                { id: "305301", name: "Angel Halo Pro" },
                { id: "104081", name: "Primarch Trials Pro" },
                { id: "104111", name: "Six-Dragon Advent Pro" },
                { id: "104191", name: "Eternals Unlock Treasure Pro" }
            ];

            let clickedARaid = false;

            for (let skip of proSkips) {
                const selector = `.btn-set-quest.multi[data-quest-id="${skip.id}"]`;
                const questBtn = document.querySelector(selector);
                
                if (questBtn && !questBtn.classList.contains('disable')) {
                    uiLog(`>> Navigating to ${skip.name} Daily Raid...`);
                    
                    const clickSuccess = await gameClick(selector, true);
                    
                    if (clickSuccess) {
                        clickedARaid = true;
                        failSafeClicked = 0; // Reset failsafe because we successfully found a raid
                        break; 
                    }
                }
            }

            if (clickedARaid) continue; 

            // 1. Is the AP Regen popup blocking us?
            const apPopup = document.querySelector('.pop-show.pop-ap-short');
            if (apPopup && window.getComputedStyle(apPopup).display !== 'none') {
                const useElixirBtn = document.querySelector('.btn-usual-use'); 
                if (useElixirBtn) {
                    await gameClick('.btn-usual-use');
                    uiLog("[Daily Skip] Consumed AP Item.");
                    failSafeClicked = 0; // Reset failsafe
                    continue;
                }
            }

            // 2. Is the standard confirmation popup blocking us?
            const okBtn = document.querySelector('.btn-usual-ok');
            if (okBtn) {
                const popupWrapper = okBtn.closest('.prt-popup-header, .pop-show');
                if (popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none') {
                    await gameClick('.btn-usual-ok');
                    uiLog("[Daily Skip] Clicked OK.");
                    failSafeClicked = 0; // Reset failsafe
                    continue;
                }
            }

            // 2. 🛠️ THE AUTO-STOP FAILSAFE
            failSafeClicked++;
            if (failSafeClicked >= 3) {
                isRunning = false;
                sessionStorage.setItem('gbf_isRunning', 'false');
                uiLog(">> ⚠️ All quests done. Stopping the engine to prevent issues.");
                
                // Broadcast IDLE so the panel button instantly turns green
                chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'IDLE' }).catch(() => {});
                break;
            }
        }

        // --- STATE B: Raid Support Screen ---
        else if(currentHash.includes("quest/supporter/")) {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'SUPPORTER_SELECT' }).catch(() => {});
            
            const startBtn = document.querySelector('.se-quest-start');
            if (startBtn) {
                await gameClick('.se-quest-start');
                uiLog("[Daily Skip] Starting Skip...");
                continue; 
            }
        }

        // --- STATE C: Pro Skip Result Screen ---
        else if (currentHash.includes("result_pro_quest_skip")) {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'BATTLE_FINISHED' }).catch(() => {});
            uiLog("[Daily Skip] Processing Results...");
            let madeAnAction = false;

            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult){
                madeAnAction = true;
                continue; 
            }

            if (document.querySelector("#cjs-lp-rankup")) {
                await gameClick("#cjs-lp-rankup");
                uiLog("[Daily Skip] Cleared Rank Up.");
                madeAnAction = true;
            }

            if (document.querySelector(".btn-usual-close")) {
                await gameClick(".btn-usual-close");
                uiLog("[Daily Skip] Closing Results.");
                madeAnAction = true;
            }

            if(document.querySelector(".btn-usual-ok")) {
                await gameClick(".btn-usual-ok");
                uiLog("[Daily Skip] Clicking OK Button.");
                madeAnAction = true;
            }

            if (document.querySelector(".btn-control")) {
                await gameClick('.btn-control');
                uiLog("[Daily Skip] Concluding Skip Routine.");
                await sleep(1000);
                madeAnAction = true;
            }

            if (madeAnAction) continue;
        }

        // --- STATE D: Unexpected State refresh result change link ---
        else if(currentHash.includes("result/")) {
            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult) continue;
        }
        
        // --- STATE E: THE FAILSAFE (Lost in the Sauce) ---
        else {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'RECOVERING' }).catch(() => {});
            uiLog(">> 🔄 Redirecting back to Daily Raid Menu...");
            window.location.hash = "quest/multi/0";
            await sleep(2500); 
            continue;
        }
    }

    // Double check that the engine safely broadcasts IDLE when the while-loop exits naturally
    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'IDLE' }).catch(() => {});
    uiLog(">> 🛑 Engine Stopped Safely.");
}

// --- EXTENSION MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "start") {
        
        // 🛠️ FIX: Removed 'if (!isRunning)' so start command always works
        isRunning = true;
        currentRoutine = request.routine;
        
        // Save state to sessionStorage
        sessionStorage.setItem('gbf_isRunning', 'true');
        sessionStorage.setItem('gbf_routine', request.routine);
        
        uiLog(">> Engine starting up...");

        if (request.routine === "slime") farmSlimeRoutine();
        else if (request.routine === "buff") dailyBuffRoutine();
        else if (request.routine === "dailyRaid") dailyRaidSkip();
        
        sendResponse({ status: "started" });
    } else if (request.command === "stop") {
        isRunning = false;
        
        // Fully wipe the engine state when manually stopped
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