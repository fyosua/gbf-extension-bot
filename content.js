// --- content.js (The Main Engine Orchestrator) ---

// Centralized Routing Logic
function routeRoutine(routineType) {
    switch(routineType) {
        case "slime": 
            farmSlimeRoutine(); 
            break;
        case "buff": 
            dailyBuffRoutine(); 
            break;
        case "dailyRaid": 
            dailyRaidSkip(); 
            break;
        case "raidSearch":
            if (!isRunning) return; 
            uiLog(`>> Engine starting up (Targeting Slot ${currentSearchSlot}, Wait Time: ${currentWaitTime}s)...`);
            raidSearchRoutine();
            break;
        default:
            uiLog(`>> ⚠️ Unknown routine: ${routineType}`);
    }
}

// Auto-resume if the page just hard-reloaded while the engine was active
if (isRunning) {
    setTimeout(() => {
        uiLog(">> 🔄 Page reloaded. Restoring engine state...");
        routeRoutine(currentRoutine);
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
        currentSlimeId = request.slimeId || '400181/4'; // 🛠️ Receive Data
        
        // Save state to sessionStorage 
        sessionStorage.setItem('gbf_isRunning', 'true');
        sessionStorage.setItem('gbf_routine', request.routine);
        sessionStorage.setItem('gbf_searchSlot', request.searchSlot); 
        sessionStorage.setItem('gbf_waitTime', currentWaitTime); 
        sessionStorage.setItem('gbf_slimeId', currentSlimeId); // 🛠️ Store Data

        routeRoutine(request.routine);
        
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
        sendResponse({ isRunning: isRunning, currentRoutine: currentRoutine });
    }
    return true; 
});