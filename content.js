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
        case "eventRun":
            eventRunRoutine();
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
        
        // 🛠️ 1. Capture ALL dynamic settings from the UI payload
        currentRoutine = request.routine;
        currentSearchSlot = request.searchSlot; 
        currentWaitTime = request.waitTime || '15'; 
        currentSlimeId = request.slimeId || '400181/4'; 
        currentEventId = request.eventId || '944131/3'; 
        currentSummonId = request.summonId || '2040094000_04'; 
        currentSummonRank = request.summonRank || '4'; 
        
        // 🛠️ 2. Save EVERYTHING to sessionStorage so it survives GBF's hard page reloads
        sessionStorage.setItem('gbf_isRunning', 'true');
        sessionStorage.setItem('gbf_routine', request.routine);
        sessionStorage.setItem('gbf_searchSlot', request.searchSlot); 
        sessionStorage.setItem('gbf_waitTime', currentWaitTime); 
        sessionStorage.setItem('gbf_slimeId', currentSlimeId); 
        sessionStorage.setItem('gbf_eventId', currentEventId); 
        sessionStorage.setItem('gbf_summonId', currentSummonId); 
        sessionStorage.setItem('gbf_summonRank', currentSummonRank); 

        // 3. Launch the requested routine
        routeRoutine(request.routine);
        
        sendResponse({ status: "started" });
        
    } else if (request.command === "stop") {
        isRunning = false;
        
        // Instantly orphan any sleeping loops
        currentExecutionToken++; 
        
        // Wipe the engine state
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