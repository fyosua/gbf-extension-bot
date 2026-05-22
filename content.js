// --- content.js (The Main Engine Orchestrator) ---

// Auto-resume if the page just hard-reloaded while the engine was active
if (isRunning) {
    setTimeout(() => {
        uiLog(">> 🔄 Page reloaded. Restoring engine state...");
        
        // Route to the strategies loaded from the /strategies/ folder
        if (currentRoutine === "slime") farmSlimeRoutine();
        else if (currentRoutine === "buff") dailyBuffRoutine();
        else if (currentRoutine === "dailyRaid") dailyRaidSkip();
        else if (currentRoutine === "raidSearch") raidSearchRoutine(); 
    }, 1000); 
}

// --- EXTENSION MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "start") {
        
        if (isRunning) {
            uiLog(">> ⚠️ Terminating old loop and starting fresh...");
            currentExecutionToken++; 
        }

        isRunning = true;
        currentRoutine = request.routine;
        currentSearchSlot = request.searchSlot; 
        currentWaitTime = request.waitTime || '15'; 
        
        // Save state to sessionStorage (variables are handled in helpers.js)
        sessionStorage.setItem('gbf_isRunning', 'true');
        sessionStorage.setItem('gbf_routine', request.routine);
        sessionStorage.setItem('gbf_searchSlot', request.searchSlot); 
        sessionStorage.setItem('gbf_waitTime', currentWaitTime); 

        if (request.routine === "slime") farmSlimeRoutine();
        else if (request.routine === "buff") dailyBuffRoutine();
        else if (request.routine === "dailyRaid") dailyRaidSkip();
        else if (request.routine === "raidSearch"){
            uiLog(`>> Engine starting up (Targeting Slot ${currentSearchSlot}, Wait Time: ${currentWaitTime}s)...`);
            raidSearchRoutine();
        }
        
        sendResponse({ status: "started" });
        
    } else if (request.command === "stop") {
        isRunning = false;
        currentExecutionToken++; 
        
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