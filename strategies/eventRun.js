// --- strategies/eventRun.js ---

async function eventRunRoutine() {
    const myToken = ++currentExecutionToken;
    uiLog(`>> ⚔️ Event Run Engine Started! (Target: ${currentEventId})`);
    
    // 🛠️ DYNAMIC VARIABLES: Uses the value passed from your UI Panel
    const targetQuestHash = `quest/supporter/${currentEventId}`;
    
    // Grabs everything before the slash (e.g., "944131" from "944131/3")
    const baseId = currentEventId.split('/')[0];
    const baseQuestHash = `quest/supporter/${baseId}`;

    if (!window.location.hash.includes(targetQuestHash) 
        && !window.location.hash.includes("raid")
        && !window.location.hash.includes("result")) {
        uiLog(">> Navigating to Event Quest...");
        window.location.hash = targetQuestHash;
        await sleep(1000);
    }

    while (isRunning && currentExecutionToken === myToken) {
        await sleep(1000);
        if (!isRunning || currentExecutionToken !== myToken) break;

        // 🚨 CRITICAL BAN PREVENTION CHECK 🚨
        if (checkCaptcha()) {
            currentExecutionToken++; 
            break; 
        }

        const currentHash = window.location.hash;

        // --- STATE A: Supporter Page ---
        if (currentHash.includes(baseQuestHash)) {
            // Use a combined selector to find whichever start button exists
            const startSelector = ".btn-silent-se, .se-quest-start";
            const startBtn = document.querySelector(startSelector);
            
            // Added the 'disable' check back in to prevent clicking greyed-out buttons
            if (startBtn && !startBtn.classList.contains('disable')) {
                
                // gameClick naturally supports combined selectors!
                await gameClick(startSelector);
                uiLog("[Event] Party confirmed. Starting quest...");
                await sleep(1500); 
                
                // Handle standard OK popups
                const okBtn = document.querySelector(".btn-usual-ok");
                if (okBtn && window.getComputedStyle(okBtn).display !== 'none') {
                    await gameClick(".btn-usual-ok");
                    continue;
                }

                // Handle AP consumption popups
                const useElixirBtn = document.querySelector('.btn-usual-use'); 
                if (useElixirBtn) {
                    await gameClick('.btn-usual-use');
                    uiLog("[Event] Consumed AP Item.");
                    continue;
                }
                
                continue;
            } else {
                // 🛠️ Trigger the dynamic helper
                const clickedSummon = await selectSummon("[Event]");
                if (clickedSummon) continue;
            }
        }
        
        // --- STATE B: Raid Page ---
        else if (currentHash.includes("raid")) {
            const nextBtn = document.querySelector(".prt-command-end");
            if(nextBtn && window.getComputedStyle(nextBtn).display !== 'none'){
                await gameClick(".btn-result");
                continue; 
            }

            const attackBtn = document.querySelector(".btn-attack-start");
            if (attackBtn && attackBtn.getBoundingClientRect().width > 0) {
                uiLog("[Event] Battle Loaded. Engaging Auto...");
                await sleep(2500);
                await gameClick(".btn-auto");
                await waitForHash("result", "raid");
                continue; 
            }
        }
        
        // --- STATE C: Result Page ---
        else if (currentHash.includes("result")) { 
            uiLog("[Event] Result Clearing...");
            let madeAnAction = false; 

            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult){
                gameClick(".btn-control.location-href");
                madeAnAction = true;
            }

            if (document.querySelector("#cjs-lp-rankup")) {
                await gameClick("#cjs-lp-rankup");
                uiLog("[Event] Cleared Rank Up.");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedOk = await gameClick(".btn-usual-ok");
            if (clickedOk) {
                uiLog("[Event] Clicking OK...");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedClose = await gameClick(".btn-usual-close");
            if (clickedClose) {
                uiLog("[Event] Closing Results...");
                await sleep(500);
                madeAnAction = true;
            }

            const clickedRetry = await gameClick(".btn-retry.cnt-quest");
            if (clickedRetry) {
                uiLog("[Event] Clicking Play Again...");
                await sleep(500); 
                madeAnAction = true;
            }

            if (madeAnAction) continue; 
        }
    }
    
    if (currentExecutionToken === myToken) uiLog(">> 🛑 Engine Stopped Safely.");
}