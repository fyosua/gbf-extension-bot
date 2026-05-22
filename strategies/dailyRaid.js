// --- strategies/dailyRaid.js ---
async function dailyRaidSkip() {
    const myToken = ++currentExecutionToken;
    uiLog(">> ⏩ Starting Daily Raid Skip...");

    if (!buffsCheckedThisSession) {
        uiLog(">> First run detected. Initiating Pre-Grind Buff Check...");
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'BUFF_CHECK' }).catch(() => {});
        await dailyBuffRoutine(); 
        buffsCheckedThisSession = true; 
        sessionStorage.setItem('gbf_buffsChecked', 'true');
    }

    if (!window.location.hash.includes("quest/multi/0")) {
        uiLog(">> Navigating to Daily Raid Quest...");
        window.location.hash = "quest/multi/0";
        await sleep(1000);
    }

    let failSafeClicked = 0;

    while (isRunning && currentExecutionToken === myToken) {
        uiLog(">> Checking Daily Raid Quest...");
        await sleep(1000);
        if (!isRunning || currentExecutionToken !== myToken) break;

        const currentHash = window.location.hash;

        // --- STATE A: Quest Selection List ---
        if (currentHash.includes("quest/multi/0")) {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'QUEST_SELECT' }).catch(() => {});
            
            const proListBtn = document.querySelector(".btn-pro-list");
            if (proListBtn) {
                await gameClick(".btn-pro-list");
            }

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
                        failSafeClicked = 0; 
                        break; 
                    }
                }
            }

            if (clickedARaid) continue; 

            const apPopup = document.querySelector('.pop-show.pop-ap-short');
            if (apPopup && window.getComputedStyle(apPopup).display !== 'none') {
                const useElixirBtn = document.querySelector('.btn-usual-use'); 
                if (useElixirBtn) {
                    await gameClick('.btn-usual-use');
                    uiLog("[Daily Skip] Consumed AP Item.");
                    failSafeClicked = 0; 
                    continue;
                }
            }

            const okBtn = document.querySelector('.btn-usual-ok');
            if (okBtn) {
                const popupWrapper = okBtn.closest('.prt-popup-header, .pop-show');
                if (popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none') {
                    await gameClick('.btn-usual-ok');
                    uiLog("[Daily Skip] Clicked OK.");
                    failSafeClicked = 0;
                    continue;
                }
            }

            failSafeClicked++;
            if (failSafeClicked >= 3) {
                isRunning = false;
                sessionStorage.setItem('gbf_isRunning', 'false');
                uiLog(">> ⚠️ All quests done. Stopping the engine to prevent issues.");
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

        // --- STATE D: Unexpected State ---
        else if(currentHash.includes("result/")) {
            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult) continue;
        }
        
        // --- STATE E: THE FAILSAFE ---
        else {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'RECOVERING' }).catch(() => {});
            uiLog(">> 🔄 Redirecting back to Daily Raid Menu...");
            window.location.hash = "quest/multi/0";
            await sleep(2500); 
            continue;
        }
    }

    if (currentExecutionToken === myToken) {
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'IDLE' }).catch(() => {});
        uiLog(">> 🛑 Engine Stopped Safely.");
    }
}