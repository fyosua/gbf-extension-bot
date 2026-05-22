// --- helpers.js ---

// Read state from sessionStorage on load so it survives GBF's hard page reloads
let isRunning = sessionStorage.getItem('gbf_isRunning') === 'true';
let buffsCheckedThisSession = sessionStorage.getItem('gbf_buffsChecked') === 'true'; 
let currentRoutine = sessionStorage.getItem('gbf_routine') || '';
let currentSearchSlot = sessionStorage.getItem('gbf_searchSlot') || '1';
let currentWaitTime = sessionStorage.getItem('gbf_waitTime') || '15'; 

// 🛠️ ANTI-ZOMBIE LOOP: The Execution Token
let currentExecutionToken = 0;

// The heartbeat timer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sends logs to your Side Panel
function uiLog(message) {
    chrome.runtime.sendMessage({ type: "UI_LOG", text: message }).catch(() => {});
}

// Fluid clicker now accepts a 'force' parameter to bypass visibility checks
async function gameClick(selector, force = false) {
    const element = document.querySelector(selector);
    
    if (element) {
        const rect = element.getBoundingClientRect();
        
        // If force is true, we ignore rect.width > 0 (clicks hidden/unrendered elements)
        if (force || (rect.width > 0 && rect.height > 0)) {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            uiLog(`✅ Clicked: ${selector}`);
            return true;
        }
    }
    return false; 
}