// --- strategies/slime.js ---
async function farmSlimeRoutine() {
    const myToken = ++currentExecutionToken;
    uiLog(">> 🗡️ Slime Farmer Engine Started!");
    
    if (!buffsCheckedThisSession) {
        uiLog(">> First run detected. Initiating Pre-Grind Buff Check...");
        await dailyBuffRoutine(); 
        buffsCheckedThisSession = true; 
        sessionStorage.setItem('gbf_buffsChecked', 'true');
    }

    if (!window.location.hash.includes("quest/supporter/400181/4")) {
        uiLog(">> Navigating to Slime Quest...");
        window.location.hash = "quest/supporter/400181/4";
        await sleep(1000);
    }

    while (isRunning && currentExecutionToken === myToken) {
        await sleep(1000);
        if (!isRunning || currentExecutionToken !== myToken) break;

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
            } else {
                const kaguyaSummonULB = document.querySelector('.btn-supporter.lis-supporter:has([data-image="2040114000"]):has(.bless-rank2-style)');
                if(kaguyaSummonULB){
                    await gameClick('.btn-supporter.lis-supporter:has([data-image="2040114000"]):has(.bless-rank2-style)');
                    uiLog("[State A] Kaguya summon ULB detected. Selecting...");
                    await sleep(500);
                    continue;
                } else {
                    await gameClick('.btn-supporter.lis-supporter:has([data-image="2040114000"])');
                    uiLog("[State A] Kaguya summon detected. Selecting...");
                    await sleep(500);
                    continue;
                }
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

            if (madeAnAction) continue; 
        }
    }
    
    if (currentExecutionToken === myToken) uiLog(">> 🛑 Engine Stopped Safely.");
}