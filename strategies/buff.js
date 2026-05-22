// --- strategies/buff.js ---
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