import { executeInTab } from "@decky/api";
import { PluginSettings, getSettings } from "./settings";

/**
 * Injected script executed in Steam's Main Window tab ("SP" and "GamepadUI")
 * where the Family View PIN dialog is rendered.
 */
export function generateInjectedScript(settings: PluginSettings): string {
  return `
(function() {
  if (window.__familyViewNumpadInitialized) {
    if (window.__familyViewNumpadUpdateSettings) {
      window.__familyViewNumpadUpdateSettings(${JSON.stringify(settings)});
    }
    if (window.__familyViewNumpadScan) {
      window.__familyViewNumpadScan();
    }
    return;
  }
  window.__familyViewNumpadInitialized = true;

  let currentSettings = ${JSON.stringify(settings)};
  let activeContainer = null;
  let activeModal = null;
  let currentPin = "";
  let observer = null;

  const CONTAINER_ID = "decky-family-view-numpad-container";
  const STYLE_ID = "decky-family-view-numpad-styles";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = \`
      #\${CONTAINER_ID} {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        background: rgba(18, 25, 38, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        max-width: 360px;
        width: 100%;
        margin: 12px auto;
        box-sizing: border-box;
        z-index: 99999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      .fvn-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        width: 100%;
      }
      .fvn-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 52px;
        font-size: 22px;
        font-weight: 600;
        color: #ffffff;
        background-color: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 10px;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transition: all 0.1s ease-in-out;
        outline: none;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      }
      .fvn-btn:hover, .fvn-btn:focus, .fvn-btn:focus-visible {
        background-color: rgba(26, 159, 255, 0.4) !important;
        border-color: #1a9fff !important;
        box-shadow: 0 0 12px rgba(26, 159, 255, 0.8) !important;
        transform: scale(1.02);
      }
      .fvn-btn:active, .fvn-btn.fvn-active {
        background-color: #1a9fff !important;
        border-color: #66c0f4 !important;
        transform: scale(0.94);
        box-shadow: 0 0 16px rgba(26, 159, 255, 0.9) !important;
      }
      .fvn-btn-clear {
        background-color: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #fca5a5;
      }
      .fvn-btn-backspace {
        background-color: rgba(245, 158, 11, 0.2);
        border-color: rgba(245, 158, 11, 0.4);
        color: #fcd34d;
      }
      .fvn-btn-confirm {
        height: 44px;
        font-size: 16px;
        background-color: #1a9fff;
        border-color: #66c0f4;
        margin-top: 4px;
        width: 100%;
        display: flex;
        gap: 8px;
      }
      .fvn-btn-small { height: 44px; font-size: 18px; }
      .fvn-btn-large { height: 62px; font-size: 26px; }
    \`;
    document.head.appendChild(style);
  }

  function triggerHaptic() {
    if (currentSettings.hapticFeedback && typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(20); } catch (e) {}
    }
  }

  function dispatchKey(target, key, code, keyCode) {
    const opts = {
      key: key,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      charCode: key.length === 1 ? key.charCodeAt(0) : 0,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    target.dispatchEvent(new KeyboardEvent("keydown", opts));
    if (key.length === 1) target.dispatchEvent(new KeyboardEvent("keypress", opts));
    target.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  function setInputValue(input, val) {
    const proto = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, val);
    } else {
      input.value = val;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function tryUnlockParental(pin) {
    if (window.SteamClient && window.SteamClient.Parental && window.SteamClient.Parental.UnlockParentalLock) {
      try {
        const res = await window.SteamClient.Parental.UnlockParentalLock(pin, true);
        if (res === 1) {
          return true;
        }
      } catch (e) {
        console.warn("[FamilyViewNumpad] UnlockParentalLock failed:", e);
      }
    }
    return false;
  }

  function handleDigitPress(digit) {
    triggerHaptic();
    const digitStr = String(digit);
    const keyCode = 48 + parseInt(digitStr, 10);
    const code = "Digit" + digitStr;
    const modal = activeModal || document.body;

    currentPin = currentPin.length >= 4 ? digitStr : currentPin + digitStr;

    const inputs = Array.from(modal.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));
    if (inputs.length === 1) {
      const inp = inputs[0];
      inp.focus();
      if (inp.value.length < 4) {
        setInputValue(inp, inp.value + digitStr);
      }
    } else if (inputs.length >= 4) {
      const activeIdx = inputs.findIndex(i => i === document.activeElement || i.value === "");
      const target = activeIdx !== -1 ? inputs[activeIdx] : inputs[inputs.length - 1];
      target.focus();
      setInputValue(target, digitStr);
      if (activeIdx !== -1 && activeIdx < inputs.length - 1) {
        inputs[activeIdx + 1].focus();
      }
    }

    const activeEl = document.activeElement || modal;
    dispatchKey(activeEl, digitStr, code, keyCode);
    if (modal !== activeEl) dispatchKey(modal, digitStr, code, keyCode);
    dispatchKey(window, digitStr, code, keyCode);

    if (currentPin.length === 4) {
      tryUnlockParental(currentPin);
      if (currentSettings.autoSubmitOn4Digits) {
        setTimeout(() => {
          handleConfirmPress();
          currentPin = "";
        }, 150);
      }
    }
  }

  function handleBackspacePress() {
    triggerHaptic();
    const modal = activeModal || document.body;
    currentPin = currentPin.slice(0, -1);

    const inputs = Array.from(modal.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));
    if (inputs.length === 1) {
      const inp = inputs[0];
      inp.focus();
      if (inp.value.length > 0) {
        setInputValue(inp, inp.value.slice(0, -1));
      }
    } else if (inputs.length >= 4) {
      let targetIdx = -1;
      for (let i = inputs.length - 1; i >= 0; i--) {
        if (inputs[i].value !== "") {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx !== -1) {
        setInputValue(inputs[targetIdx], "");
        inputs[targetIdx].focus();
      }
    }

    const activeEl = document.activeElement || modal;
    dispatchKey(activeEl, "Backspace", "Backspace", 8);
    if (modal !== activeEl) dispatchKey(modal, "Backspace", "Backspace", 8);
    dispatchKey(window, "Backspace", "Backspace", 8);
  }

  function handleClearPress() {
    triggerHaptic();
    const modal = activeModal || document.body;
    currentPin = "";

    const inputs = Array.from(modal.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));
    inputs.forEach(i => setInputValue(i, ""));
    if (inputs.length > 0) inputs[0].focus();

    for (let i = 0; i < 4; i++) {
      dispatchKey(modal, "Backspace", "Backspace", 8);
    }
  }

  async function handleConfirmPress() {
    triggerHaptic();
    const modal = activeModal || document.body;

    if (currentPin.length === 4) {
      await tryUnlockParental(currentPin);
    }

    const buttons = Array.from(modal.querySelectorAll("button, div[role='button']"));
    const confirmBtn = buttons.find(b => {
      const t = (b.innerText || b.textContent || "").toLowerCase().trim();
      return t === "confirm" || t === "confirmer" || t === "ok" || t === "valider";
    });
    if (confirmBtn) {
      confirmBtn.click();
    }

    const activeEl = document.activeElement || modal;
    dispatchKey(activeEl, "Enter", "Enter", 13);
    if (modal !== activeEl) dispatchKey(modal, "Enter", "Enter", 13);
    dispatchKey(window, "Enter", "Enter", 13);
  }

  function isModalFamilyView(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    const text = (el.innerText || el.textContent || "").toLowerCase();

    const isClassMatch = el.className && typeof el.className === "string" && (el.className.includes("ParentalPINDialog") || el.className.includes("DigitInputField"));
    const hasFamily = text.includes("family view") || text.includes("mode famille") || text.includes("parental") || text.includes("famille");
    const hasPin = text.includes("pin") || text.includes("enter") || text.includes("entrer") || text.includes("exit") || text.includes("quitter");
    const hasPinBoxes = el.querySelectorAll('input, [class*="PinDigit"], [class*="pin_digit"], [class*="DigitInputField"]').length >= 1;

    return isClassMatch || (hasFamily && (hasPin || hasPinBoxes));
  }

  function findModal() {
    const dialogs = Array.from(document.querySelectorAll('div[class*="ParentalPINDialog"], div[class*="DigitInputField"], div[role="dialog"], div[class*="DialogContent"], div[class*="ModalPosition"], div[class*="Modal_"], div[class*="Dialog_"], div[class*="PinDialog"], div[class*="Parental"], .DialogControlsSection, .DialogContent'));
    for (const d of dialogs) {
      if (isModalFamilyView(d)) {
        return d.closest('div[role="dialog"], div[class*="Modal_"], div[class*="Dialog_"]') || d;
      }
    }
    const all = Array.from(document.querySelectorAll('body > div, #root > div, div[class*="popup"], div[class*="overlay"]'));
    for (const a of all) {
      if (isModalFamilyView(a)) return a;
    }
    return null;
  }

  function buildNumpadDOM(modal) {
    if (document.getElementById(CONTAINER_ID)) return;
    injectStyles();

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    if (currentSettings.compactMode) {
      container.style.padding = "8px";
      container.style.gap = "6px";
    }

    const grid = document.createElement("div");
    grid.className = "fvn-grid";

    const sizeClass = currentSettings.buttonSize === "small" ? " fvn-btn-small" : currentSettings.buttonSize === "large" ? " fvn-btn-large" : "";

    // 1 to 9
    for (let d = 1; d <= 9; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fvn-btn" + sizeClass;
      btn.tabIndex = 0;
      btn.textContent = String(d);
      btn.addEventListener("click", () => handleDigitPress(d));
      grid.appendChild(btn);
    }

    // Row 4: Clear (C), 0, Backspace
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "fvn-btn fvn-btn-clear" + sizeClass;
    clearBtn.tabIndex = 0;
    clearBtn.title = "Clear all";
    clearBtn.innerHTML = "✕";
    clearBtn.addEventListener("click", handleClearPress);
    grid.appendChild(clearBtn);

    const zeroBtn = document.createElement("button");
    zeroBtn.type = "button";
    zeroBtn.className = "fvn-btn" + sizeClass;
    zeroBtn.tabIndex = 0;
    zeroBtn.textContent = "0";
    zeroBtn.addEventListener("click", () => handleDigitPress(0));
    grid.appendChild(zeroBtn);

    const backspaceBtn = document.createElement("button");
    backspaceBtn.type = "button";
    backspaceBtn.className = "fvn-btn fvn-btn-backspace" + sizeClass;
    backspaceBtn.tabIndex = 0;
    backspaceBtn.title = "Backspace";
    backspaceBtn.innerHTML = "⌫";
    backspaceBtn.addEventListener("click", handleBackspacePress);
    grid.appendChild(backspaceBtn);

    container.appendChild(grid);

    // Confirm button
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "fvn-btn fvn-btn-confirm" + sizeClass;
    confirmBtn.tabIndex = 0;
    confirmBtn.innerHTML = "<span>✓</span> <span>Confirm</span>";
    confirmBtn.addEventListener("click", handleConfirmPress);
    container.appendChild(confirmBtn);

    // Insertion
    const buttonsSec = modal.querySelector('div[class*="DialogControlsSection"], div[class*="DialogFooter"], div[class*="ButtonsRow"], div[class*="ModalFooter"]');
    const inputsSec = modal.querySelector('div[class*="PinEntry"], div[class*="PinInput"], div[class*="DigitInputField"], div[class*="InputsRow"], div[class*="DialogBody"]');

    if (buttonsSec && buttonsSec.parentNode) {
      buttonsSec.parentNode.insertBefore(container, buttonsSec);
    } else if (inputsSec && inputsSec.parentNode) {
      inputsSec.parentNode.insertBefore(container, inputsSec.nextSibling);
    } else {
      modal.appendChild(container);
    }

    activeContainer = container;
    activeModal = modal;
    currentPin = "";
  }

  function unmountDOM() {
    if (activeContainer && activeContainer.parentNode) {
      activeContainer.parentNode.removeChild(activeContainer);
    }
    const el = document.getElementById(CONTAINER_ID);
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    activeContainer = null;
    activeModal = null;
    currentPin = "";
  }

  function scanAndInject() {
    if (!currentSettings.enabled) {
      unmountDOM();
      return;
    }
    const modal = findModal();
    if (modal) {
      if (!activeContainer || !document.body.contains(activeContainer) || activeModal !== modal) {
        buildNumpadDOM(modal);
      }
    } else {
      if (activeContainer && (!activeModal || !document.body.contains(activeModal))) {
        unmountDOM();
      }
    }
  }

  // Set up global functions
  window.__familyViewNumpadScan = scanAndInject;
  window.__familyViewNumpadUpdateSettings = function(newSettings) {
    currentSettings = Object.assign({}, currentSettings, newSettings);
    if (!currentSettings.enabled) {
      unmountDOM();
    } else {
      scanAndInject();
    }
  };
  window.__familyViewNumpadCleanup = function() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    unmountDOM();
    window.__familyViewNumpadInitialized = false;
  };

  // Start MutationObserver on document.body
  if (observer) observer.disconnect();
  observer = new MutationObserver((mutations) => {
    let check = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
        check = true;
        break;
      }
    }
    if (check) scanAndInject();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Run initial scan
  scanAndInject();
})();
`;
}

/**
 * Executes the injection script across all relevant Steam tabs (SP, GamepadUI, etc.)
 */
export async function injectIntoSteamTabs(settings: PluginSettings = getSettings()): Promise<void> {
  const script = generateInjectedScript(settings);
  const targetTabs = ["SP", "GamepadUI", "SharedJSContext", ""];

  for (const tab of targetTabs) {
    try {
      if (tab) {
        await executeInTab(tab, true, script);
      }
    } catch (e) {
      // Ignore tab connection errors if tab is not active
    }
  }
}

/**
 * Triggers modal scan in Steam tabs
 */
export async function scanInSteamTabs(): Promise<void> {
  const targetTabs = ["SP", "GamepadUI", "SharedJSContext"];
  const scanCode = `if (window.__familyViewNumpadScan) { window.__familyViewNumpadScan(); }`;

  for (const tab of targetTabs) {
    try {
      await executeInTab(tab, true, scanCode);
    } catch (e) {}
  }
}

/**
 * Pushes new settings to Steam tabs
 */
export async function updateSettingsInSteamTabs(settings: PluginSettings): Promise<void> {
  const targetTabs = ["SP", "GamepadUI", "SharedJSContext"];
  const updateCode = `if (window.__familyViewNumpadUpdateSettings) { window.__familyViewNumpadUpdateSettings(${JSON.stringify(settings)}); }`;

  for (const tab of targetTabs) {
    try {
      await executeInTab(tab, true, updateCode);
    } catch (e) {}
  }
}

/**
 * Cleans up injected scripts in Steam tabs
 */
export async function cleanupInSteamTabs(): Promise<void> {
  const targetTabs = ["SP", "GamepadUI", "SharedJSContext"];
  const cleanupCode = `if (window.__familyViewNumpadCleanup) { window.__familyViewNumpadCleanup(); }`;

  for (const tab of targetTabs) {
    try {
      await executeInTab(tab, true, cleanupCode);
    } catch (e) {}
  }
}
