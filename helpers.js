// --- helpers.js ---

// Read state from sessionStorage on load so it survives GBF's hard page reloads
let isRunning = sessionStorage.getItem('gbf_isRunning') === 'true';
let buffsCheckedThisSession = sessionStorage.getItem('gbf_buffsChecked') === 'true'; 
let currentRoutine = sessionStorage.getItem('gbf_routine') || '';
let currentSearchSlot = sessionStorage.getItem('gbf_searchSlot') || '1';
let currentWaitTime = sessionStorage.getItem('gbf_waitTime') || '15'; 
let currentSlimeId = sessionStorage.getItem('gbf_slimeId') || '400181/4'; // 🛠️ NEW Memory State

// 🛠️ ANTI-ZOMBIE LOOP: The Execution Token
let currentExecutionToken = 0;

// The heartbeat timer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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