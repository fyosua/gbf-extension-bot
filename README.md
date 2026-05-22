# 🗡️ Granblue Automation Framework

A lightweight, state-based DOM automation tool for Granblue Fantasy, built as a Manifest V3 Chrome Extension.

Unlike traditional macro recorders or pixel-search bots, this framework operates natively within the browser environment. It uses a **Tick-Based State Machine** to read the game's actual URL hash and DOM elements in real-time, making it highly resilient to network lag, loading screen freezes, and hidden "ghost" buttons.

## ✨ Features

* **Tick-Based Heartbeat Engine:** Evaluates the game state every second, ensuring flawless transitions and instant response to manual stops.
* **Execution Token Safety:** Prevents memory leaks and race conditions by assigning unique execution tokens to every loop, guaranteeing old routines are instantly orphaned when new commands are issued.
* **Dynamic Side Panel UI:** A custom dark mode terminal that docks directly to your browser. Features state-aware action buttons and dynamic configuration menus that only appear when relevant to the selected routine.
* **Persistent Session Memory:** Utilizes `sessionStorage` to survive Granblue's native page reloads, soft-errors, and hash routing.
* **Native DOM Injection:** Synthesizes precise `mousedown` and `mouseup` events directly on game elements. Includes a `force` parameter to interact with unrendered or hidden DOM lists.
* **Drift Recovery:** Automatically detects if the game state gets lost due to lag or soft-errors and safely redirects back to a known active URL hash.

## 🤖 Automated Routines

* **🎁 Daily Buff Checker:** Verifies and activates Trajectory Drops (0/3) before grinding. Fires automatically once per session.
* **🗡️ Slime Farmer:** Fully handles supporter selection, AP item consumption, battle engagement, result processing, Rank Up popups, and automatic retries.
* **⏩ Daily Pro Skip:** Dynamically sweeps through all available Pro Skip raids (Hard+, Omega, Primarch, etc.). Automatically halts the engine and resets the UI when all daily skips are complete.
* **🔍 Auto Raid Search:** Autonomously navigates the Assist Lobby, joins targeted raid slots, clears EP popups, selects fallback supporters, and engages the Auto-Attack sequence. Features a configurable wait-time parameter for "Wanpan" (one-punch) leeching.

## 🛠️ Architecture

The framework uses a modular script injection architecture to maintain a clean workspace while sharing memory across the extension environment.

* **Frontend:** Vanilla HTML/CSS (`panel.html`) using Flexbox for a responsive log terminal.
* **Backend:** Vanilla JavaScript (`background.js`) for service worker routing.
* **Engine Core:** `helpers.js` and `content.js` handle the state machine and DOM manipulation.
* **Strategies:** Individual routines are isolated in the `strategies/` directory (`buff.js`, `slime.js`, `dailyRaid.js`, `raidSearch.js`) for easy expansion and maintenance.
* **Permissions:** Utilizes Manifest V3 `scripting`, `activeTab`, `tabs`, and `sidePanel` APIs.

## 🚀 Installation

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** ON (top right corner).
4. Click **Load unpacked** (top left corner).
5. Select the folder containing this repository.
6. Make sure you hit the refresh icon on the extension card and hard-refresh (F5) your GBF tab if updating from a previous version.

## 🎮 Usage

1. Open Granblue Fantasy (`game.granbluefantasy.jp` or `gbf.game.mbga.jp`) in a Chrome tab.
2. Click the Extension icon in your Chrome toolbar to open the Automation Framework Side Panel.
3. Select your desired routine from the dropdown menu.
4. Configure any dynamic settings (like Search Slots or Wait Times) that appear.
5. Click **Start Engine**.

The UI button will dynamically change to reflect the bot's current action. To stop the bot at any time, click the red **Stop Engine** button. The execution token will instantly halt the loop and clear its memory.

## ⚠️ Disclaimer

This tool is built for educational and theoretical proof-of-concept purposes regarding browser DOM manipulation and state-machine architecture. Using automation tools in Granblue Fantasy violates the Terms of Service. Use at your own risk; the creator is not responsible for any account bans or penalties.