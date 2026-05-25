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
                // 1. Try for the Target Rank using "starts with" (^=) for the dynamic ID
                const targetSelector = `.btn-supporter.lis-supporter:has([data-image^="${currentSummonId}"]):has(.bless-rank${currentSummonRank}-style)`;
                const SummonTarget = document.querySelector(targetSelector);
                
                if(SummonTarget){
                    await gameClick(targetSelector);
                    uiLog(`[Event] Target Summon (${currentSummonId}) Rank ${currentSummonRank} detected. Selecting...`);
                    await sleep(500);
                    continue;
                } 
                
                // 2. Try for Standard Fallback using "starts with" (^=) (Any Rank of that Summon)
                const fallbackSelector = `.btn-supporter.lis-supporter:has([data-image^="${currentSummonId}"])`;
                const SummonFallback = document.querySelector(fallbackSelector);
                
                if (SummonFallback) {
                    await gameClick(fallbackSelector);
                    uiLog(`[Event] Target Summon (${currentSummonId}) detected (Fallback rank). Selecting...`);
                    await sleep(500);
                    continue;
                }
                
                // 3. Absolute Fallback (So it doesn't freeze if your target summon is completely missing)
                const absoluteFallback = document.querySelector('.btn-supporter.lis-supporter');
                if (absoluteFallback) {
                    await gameClick('.btn-supporter.lis-supporter');
                    uiLog("[Event] Target summon missing. Selecting absolute fallback...");
                    await sleep(500);
                    continue;
                }
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