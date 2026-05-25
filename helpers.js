// --- helpers.js ---

// Read state from sessionStorage on load so it survives GBF's hard page reloads
let isRunning = sessionStorage.getItem('gbf_isRunning') === 'true';
let buffsCheckedThisSession = sessionStorage.getItem('gbf_buffsChecked') === 'true'; 
let currentRoutine = sessionStorage.getItem('gbf_routine') || '';
let currentSearchSlot = sessionStorage.getItem('gbf_searchSlot') || '1';
let currentWaitTime = sessionStorage.getItem('gbf_waitTime') || '15'; 
let currentSlimeId = sessionStorage.getItem('gbf_slimeId') || '400181/4';
let currentEventId = sessionStorage.getItem('gbf_eventId') || '944131/3';
let currentSummonId = sessionStorage.getItem('gbf_summonId') || '2040094000_04';
let currentSummonRank = sessionStorage.getItem('gbf_summonRank') || '4'; 

// 🛠️ ANTI-ZOMBIE LOOP: The Execution Token
let currentExecutionToken = 0;

// The heartbeat timer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 🛠️ SMART HASH WAITER
 * Pauses until the target hash is reached, but includes escape hatches 
 * for CAPTCHAs and unexpected game redirects.
 * @param {string} targetHash - The hash fragment to wait for (e.g., "quest/assist")
 * @param {string} originHash - The hash fragment we are transitioning from.
 * @returns {Promise<boolean>} - True if reached, false if interrupted or stopped
 */
async function waitForHash(targetHash, originHash) {
    const interval = 500;

    while (isRunning) {
        // 🚨 ESCAPE HATCH 1: Check for Captcha while waiting!
        if (checkCaptcha()) {
            return false; // Engine is halted by checkCaptcha, break the wait
        }

        const currentHash = window.location.hash;

        // ✅ SUCCESS: The target hash was reached
        if (currentHash.includes(targetHash)) {
            uiLog(`✅ SUCCESS: The target hash was reached`);
            return true; 
        }

        // 🚨 ESCAPE HATCH 2: Unexpected redirects
        // Abort if the game redirects us to a hash that is NEITHER the origin NOR the target.
        if (!currentHash.includes(originHash) && !currentHash.includes(targetHash)) {
            uiLog(`>> ⚠️ Unexpected redirect detected (${currentHash}). Aborting wait!`);
            return false; 
        }

        await sleep(interval);
    }
    
    // Returns false if the engine was stopped manually
    return false;
}

// Sends logs to your Side Panel
function uiLog(message) {
    chrome.runtime.sendMessage({ type: "UI_LOG", text: message }).catch(() => {});
}

// 🚨 HIGH ALERT: STRICT ACCESS VERIFICATION CHECKER 🚨
function checkCaptcha() {
    const activePopup = document.querySelector('.pop-show');
    
    if (activePopup && window.getComputedStyle(activePopup).display !== 'none') {
        const popupHeader = activePopup.querySelector('.prt-popup-header');
        
        if (popupHeader && popupHeader.textContent.includes('Access Verification')) {
            uiLog(">> 🚨 CRITICAL: ACCESS VERIFICATION DETECTED! 🚨");
            uiLog(">> Emergency stop activated to prevent account ban!");
            
            isRunning = false;
            sessionStorage.setItem('gbf_isRunning', 'false');
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', state: 'IDLE' }).catch(() => {});
            
            return true; 
        }
    }
    return false; 
}

/**
 * Synthesizes a native mouse click on a target DOM element.
 * @param {string} selector - The CSS selector of the target element.
 * @param {boolean} [force=false] - If true, bypasses visibility checks (rect.width > 0) 
 * to click elements that are in the DOM but unrendered/hidden.
 * @returns {Promise<boolean>} - Returns true if the element was successfully clicked.
 */
async function gameClick(selector, force = false) {
    const element = document.querySelector(selector);
    
    if (element) {
        const rect = element.getBoundingClientRect();
        if (force || (rect.width > 0 && rect.height > 0)) {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            uiLog(`✅ Clicked: ${selector}`);
            return true;
        }
    }
    return false; 
}