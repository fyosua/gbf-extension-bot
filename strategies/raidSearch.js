// --- strategies/raidSearch.js ---
async function raidSearchRoutine() {
    const myToken = ++currentExecutionToken;
    uiLog(`>> 🔍 Starting Raid Search Routine (Targeting Slot ${currentSearchSlot}, Wait Time: ${currentWaitTime}s)...`);

    const currentLoc = window.location.hash;
    if (!currentLoc.includes("quest/assist") && 
        !currentLoc.includes("quest/supporter_raid") && 
        !currentLoc.includes("raid_multi") && 
        !currentLoc.includes("result")) {
        uiLog(">> Navigating to Assist Lobby...");
        window.location.hash = "quest/assist";
        await sleep(1000);
    }

    while (isRunning && currentExecutionToken === myToken) {
        await sleep(1000);
        if (!isRunning || currentExecutionToken !== myToken) break;

        // 🚨 CRITICAL BAN PREVENTION CHECK 🚨
        if (checkCaptcha()) {
            currentExecutionToken++; // Immediately orphan this loop
            break; // Completely halt execution
        }

        const currentHash = window.location.hash;

        // --- STATE A: Quest Assist Lobby ---
        if (currentHash.includes("quest/assist")) {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'SEARCHING' }).catch(() => {});
            
            const popupWrapper = document.querySelector('.pop-show');
            if(popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none' 
            && document.querySelector('#popup-body').innerText === "You can only provide backup in up to three raid battles at once.") {
                await gameClick('.pop-show .btn-usual-ok', true);
                uiLog(">> Cleared '3 Raid Limit' Popup.");
                await sleep(5000);
                continue;
            }
            else if(popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none' 
            && document.querySelector('#popup-body').innerText === "This raid battle has already ended.") {
                await gameClick('.pop-show .btn-usual-ok', true);
                uiLog(">> Cleared 'Already Ended' Popup.");
                await sleep(1000);
                gameClick('.btn-search-refresh');
                continue;
            }
            else if(document.querySelector('.pop-result-assist-raid.pop-show') 
            && window.getComputedStyle(document.querySelector('.pop-result-assist-raid.pop-show')).display !== 'none') {
                const okBtn = document.querySelector('.pop-result-assist-raid.pop-show > .prt-popup-footer > .btn-usual-ok');
                if (okBtn) {
                    uiLog(">> ⚠️ Raid already ended! Clearing popup...");
                    await gameClick('.pop-result-assist-raid .btn-usual-ok', true);
                    await sleep(1000);
                    continue;
                }
            }
            else if(popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none') {
                const hasBtn = popupWrapper.querySelector('.btn-usual-use, .btn-usual-ok');
                if (hasBtn) {
                    await gameClick('.pop-show .btn-usual-use, .pop-show .btn-usual-ok', true);
                    uiLog(">> Cleared Popup (Consumed EP or closed alert).");
                    continue;
                }
            }

            // Ensure we are on the correct Search Tab first
            const searchTab = document.querySelector('#tab-search.btn-tabs');
            if (searchTab && !searchTab.classList.contains('active')) {
                uiLog(">> Switching to 'Search' tab...");
                await gameClick('#tab-search.btn-tabs');
                continue; 
            }

            // Ensure we are on the correct Target Slot second
            const slotSelector = `.btn-search-switch[data-slot="${currentSearchSlot}"]`;
            const slotBtn = document.querySelector(slotSelector);
            if (slotBtn && !slotBtn.classList.contains('active')) {
                uiLog(`>> Selecting Search Slot ${currentSearchSlot}...`);
                await gameClick(slotSelector);
                continue; 
            }

            // 🛠️ NEW FIX: Check if the raid list is empty after selecting the correct slot
            const noTargetTxt = document.querySelector('.txt-no-search-target');
            if (noTargetTxt && noTargetTxt.getBoundingClientRect().width > 0) {
                uiLog(">> No active raids found. Refreshing list...");
                await gameClick('.btn-search-refresh');
                await sleep(1000); // Give the network a beat to fetch new raids
                continue;
            }

            // Finally, engage the raid if available
            const availableRaid = document.querySelector('.btn-multi-raid');
            if (availableRaid) {
                uiLog(">> Raid found! Joining...");
                await gameClick('.btn-multi-raid', true); 
                await sleep(1000);
                continue;
            }
        }
        
        // --- STATE B: Supporter / Summon Selection Page ---
        else if (currentHash.includes("quest/supporter_raid")) {
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'SUPPORTER_SELECT' }).catch(() => {});

            const popupWrapper = document.querySelector('.pop-show');
            if(popupWrapper && window.getComputedStyle(popupWrapper).display !== 'none') {
                const hasBtn = popupWrapper.querySelector('.btn-usual-use, .btn-usual-ok');
                if (hasBtn) {
                    await gameClick('.pop-show .btn-usual-use, .pop-show .btn-usual-ok', true);
                    uiLog(">> Cleared Popup (Consumed EP or closed alert).");
                    continue;
                }
            }
            
            const startBtn = document.querySelector('.se-quest-start');
            if (startBtn && !startBtn.classList.contains('disable')) {
                await gameClick('.se-quest-start');
                uiLog("[Raid Search] Party confirmed. Starting...");
                continue; 
            } else {
                const summon = document.querySelector('.prt-supporter-detail');
                if (summon) {
                    uiLog("[Raid Search] Selecting Summon...");
                    await gameClick('.prt-supporter-detail');
                    continue;
                }
            }
        }
        
        // --- STATE C: Raid Battle ---
        else if (currentHash.includes("raid_multi")) {
            const clickedAuto = document.querySelector(".btn-auto");
            if (clickedAuto && clickedAuto.getBoundingClientRect().width > 0) {
                await gameClick(".btn-auto");
                
                const waitMs = parseInt(currentWaitTime, 10) * 1000;
                uiLog(`[Raid Search] Action confirmed. Waiting ${currentWaitTime} seconds...`);
                await sleep(waitMs);
                
                uiLog(`[Raid Search] ${currentWaitTime}s elapsed! Returning to lobby...`);
                window.location.hash = "quest/assist";
                continue; 
            }
        }

        // --- STATE D: Result Clearing ---
        else if (currentHash.includes("result")) { 
            uiLog("[Raid Search] Result Clearing...");
            let madeAnAction = false;

            const emptyResult = document.querySelector(".txt-empty-notice");
            if(emptyResult){
                gameClick(".btn-control.location-href");
                madeAnAction = true;
            }

            if (document.querySelector("#cjs-lp-rankup")) {
                await gameClick("#cjs-lp-rankup");
                uiLog("Cleared Rank Up.");
                madeAnAction = true;
            }

            if (document.querySelector(".btn-usual-ok")) {
                await gameClick(".btn-usual-ok");
                madeAnAction = true;
            }

            if (document.querySelector(".btn-usual-close")) {
                await gameClick(".btn-usual-close");
                madeAnAction = true;
            }

            const clickedRetry = document.querySelector(".btn-control");
            const unclaimedButton = document.querySelector(".btn-unclaimed.active");
            if (clickedRetry && !unclaimedButton) {
                uiLog("[Raid Search] Returning to search lobby...");
                await gameClick(".btn-control");
                await sleep(1000); 
                madeAnAction = true;
            }
            else if (unclaimedButton) {
                uiLog("[Raid Search] Clear unclaimed rewards...");
                await gameClick(".btn-unclaimed.active");
                await sleep(500);
                madeAnAction = true;
            }

            if (madeAnAction) continue; 
        }
        
        // --- STATE E: The Failsafe ---
        else {
            uiLog(">> 🔄 Redirecting back to Assist Lobby...");
            window.location.hash = "quest/assist";
            await sleep(2500); 
            continue;
        }
    }

    if (currentExecutionToken === myToken) {
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'IDLE' }).catch(() => {});
        uiLog(">> 🛑 Engine Stopped Safely.");
    }
}