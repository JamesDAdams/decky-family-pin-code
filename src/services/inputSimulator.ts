/**
 * Utility to simulate keyboard inputs and interact directly with SteamOS Family View PIN modal.
 */

export interface KeyPressOptions {
  autoSubmitOn4Digits?: boolean;
}

/**
 * Checks whether an element belongs to Decky's own UI (e.g. QAM, Preview) to avoid false positives.
 */
export function isDeckyUIElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  return Boolean(
    el.closest(
      '#decky-root, [class*="quickaccess"], [class*="QuickAccess"], [class*="quickAccess"], .decky-preview, [data-decky], .family-view-numpad-preview'
    )
  );
}

/**
 * Dispatches simulated keyboard events (keydown, keypress, keyup) for a specific key.
 */
export function dispatchKeyEvent(
  target: HTMLElement | Window | Document,
  key: string,
  code: string,
  keyCode: number
): boolean {
  const eventInit: KeyboardEventInit = {
    key,
    code,
    keyCode,
    which: keyCode,
    charCode: key.length === 1 ? key.charCodeAt(0) : 0,
    bubbles: true,
    cancelable: true,
    composed: true,
  };

  const keydown = new KeyboardEvent("keydown", eventInit);
  const keypress = new KeyboardEvent("keypress", eventInit);
  const keyup = new KeyboardEvent("keyup", eventInit);

  const prevented = !target.dispatchEvent(keydown);
  if (!prevented && key.length === 1) {
    target.dispatchEvent(keypress);
  }
  target.dispatchEvent(keyup);

  return !prevented;
}

/**
 * Finds the active modal container in the DOM.
 */
export function getFamilyViewModalContainer(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'div[class*="Dialog"], div[class*="Modal"], div[class*="familyview"], div[role="dialog"], .DialogContent, .ModalPosition, .DialogControlsSection'
    )
  );

  for (const el of candidates) {
    if (isDeckyUIElement(el)) continue;

    const text = (el.innerText || el.textContent || "").toLowerCase();
    if (
      (text.includes("family view") || text.includes("mode famille") || text.includes("famille")) &&
      (text.includes("pin") || text.includes("enter") || text.includes("entrer") || text.includes("exit"))
    ) {
      const dialog = el.closest<HTMLElement>('div[role="dialog"], div[class*="Modal_"], div[class*="Dialog_"]') || el;
      if (!isDeckyUIElement(dialog)) {
        return dialog;
      }
    }
  }

  const allDialogs = Array.from(document.querySelectorAll<HTMLElement>('div[role="dialog"], .DialogContent, div[class*="Dialog"]'));
  for (const dialog of allDialogs) {
    if (isDeckyUIElement(dialog)) continue;
    const text = (dialog.innerText || "").toLowerCase();
    if (text.includes("pin") || text.includes("family")) {
      return dialog;
    }
  }

  return null;
}

/**
 * Helper to trigger React's synthetic input tracker when setting .value directly
 */
function setNativeInputValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Handles typing a numeric digit (0-9) into the modal.
 */
export function sendDigit(digit: number | string, modalElement?: HTMLElement | null): void {
  const digitStr = String(digit);
  const keyCode = 48 + parseInt(digitStr, 10);
  const code = `Digit${digitStr}`;
  const modal = modalElement || getFamilyViewModalContainer() || document.body;

  const inputs = Array.from(modal.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));

  if (inputs.length === 1) {
    const input = inputs[0];
    input.focus();
    if (input.value.length < 4) {
      setNativeInputValue(input, input.value + digitStr);
    }
  } else if (inputs.length >= 4) {
    const activeIndex = inputs.findIndex((inp) => inp === document.activeElement || inp.value === "");
    const targetInput = activeIndex !== -1 ? inputs[activeIndex] : inputs[inputs.length - 1];
    targetInput.focus();
    setNativeInputValue(targetInput, digitStr);

    if (activeIndex !== -1 && activeIndex < inputs.length - 1) {
      inputs[activeIndex + 1].focus();
    }
  }

  const activeEl = (document.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, digitStr, code, keyCode);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, digitStr, code, keyCode);
  }
  dispatchKeyEvent(window, digitStr, code, keyCode);
}

/**
 * Handles Backspace key (delete last entered digit).
 */
export function sendBackspace(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const inputs = Array.from(modal.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));

  if (inputs.length === 1) {
    const input = inputs[0];
    input.focus();
    if (input.value.length > 0) {
      setNativeInputValue(input, input.value.slice(0, -1));
    }
  } else if (inputs.length >= 4) {
    let targetIndex = -1;
    for (let i = inputs.length - 1; i >= 0; i--) {
      if (inputs[i].value !== "") {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1 && document.activeElement) {
      targetIndex = inputs.indexOf(document.activeElement as HTMLInputElement);
    }
    if (targetIndex !== -1) {
      const targetInput = inputs[targetIndex];
      setNativeInputValue(targetInput, "");
      targetInput.focus();
    }
  }

  const activeEl = (document.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, "Backspace", "Backspace", 8);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, "Backspace", "Backspace", 8);
  }
  dispatchKeyEvent(window, "Backspace", "Backspace", 8);
}

/**
 * Handles clearing all 4 digits.
 */
export function sendClear(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const inputs = Array.from(modal.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="password"], input[type="number"], input:not([type])'));

  for (const input of inputs) {
    setNativeInputValue(input, "");
  }

  if (inputs.length > 0) {
    inputs[0].focus();
  }

  for (let i = 0; i < 4; i++) {
    sendBackspace(modal);
  }
}

/**
 * Handles Confirm / Enter action to submit the PIN.
 */
export function sendConfirm(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;

  const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>("button, div[role='button']"));
  const confirmBtn = buttons.find((btn) => {
    const text = (btn.innerText || btn.textContent || "").toLowerCase().trim();
    return text === "confirm" || text === "confirmer" || text === "ok" || text === "valider";
  });

  if (confirmBtn) {
    confirmBtn.click();
  }

  const activeEl = (document.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, "Enter", "Enter", 13);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, "Enter", "Enter", 13);
  }
  dispatchKeyEvent(window, "Enter", "Enter", 13);
}
