/**
 * Input simulator & Steam Parental API integration for SteamOS Family View PIN modal.
 */

declare global {
  interface Window {
    SteamClient?: {
      Parental?: {
        UnlockParentalLock: (pin: string, remember: boolean) => Promise<number>;
        LockParentalLock: () => Promise<number>;
      };
      User?: any;
    };
  }
}

export function isDeckyUIElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  return Boolean(
    el.closest(
      '#decky-root, [class*="quickaccess"], [class*="QuickAccess"], [class*="quickAccess"], .decky-preview, [data-decky], .family-view-numpad-preview'
    )
  );
}

export function getParentalAPI(): { UnlockParentalLock: (pin: string, remember: boolean) => Promise<number> } | null {
  const win = typeof window !== "undefined" ? window : null;
  if (win?.SteamClient?.Parental) {
    return win.SteamClient.Parental;
  }
  const topWin = win?.top as any;
  if (topWin?.SteamClient?.Parental) {
    return topWin.SteamClient.Parental;
  }
  const parentWin = win?.parent as any;
  if (parentWin?.SteamClient?.Parental) {
    return parentWin.SteamClient.Parental;
  }
  return null;
}

export async function unlockWithParentalAPI(pin: string): Promise<boolean> {
  const api = getParentalAPI();
  if (api) {
    try {
      const res = await api.UnlockParentalLock(pin, true);
      return res === 1;
    } catch (e) {
      console.warn("[FamilyViewNumpad] UnlockParentalLock call failed:", e);
    }
  }
  return false;
}

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

export function getFamilyViewModalContainer(rootDoc: Document = document): HTMLElement | null {
  const candidates = Array.from(
    rootDoc.querySelectorAll<HTMLElement>(
      'div[class*="ParentalPINDialog"], div[class*="DigitInputField"], div[class*="Dialog"], div[class*="Modal"], div[class*="familyview"], div[role="dialog"], .DialogContent, .ModalPosition, .DialogControlsSection'
    )
  );

  for (const el of candidates) {
    if (isDeckyUIElement(el)) continue;

    const text = (el.innerText || el.textContent || "").toLowerCase();
    const isClassMatch =
      el.className &&
      typeof el.className === "string" &&
      (el.className.includes("ParentalPINDialog") || el.className.includes("DigitInputField"));

    const hasFamilyText =
      text.includes("family view") ||
      text.includes("mode famille") ||
      text.includes("parental") ||
      text.includes("contrôle parental") ||
      text.includes("famille");

    const hasPinText =
      text.includes("pin") ||
      text.includes("enter") ||
      text.includes("entrer") ||
      text.includes("exit") ||
      text.includes("quitter");

    const hasPinBoxes =
      el.querySelectorAll('input, [class*="PinDigit"], [class*="pin_digit"], [class*="DigitInputField"]').length >= 1;

    if (isClassMatch || (hasFamilyText && (hasPinText || hasPinBoxes))) {
      const dialog =
        el.closest<HTMLElement>('div[role="dialog"], div[class*="Modal_"], div[class*="Dialog_"]') || el;
      if (!isDeckyUIElement(dialog)) {
        return dialog;
      }
    }
  }

  return null;
}

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

export function sendDigit(digit: number | string, modalElement?: HTMLElement | null): void {
  const digitStr = String(digit);
  const keyCode = 48 + parseInt(digitStr, 10);
  const code = `Digit${digitStr}`;
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const targetDoc = modal.ownerDocument || document;
  const targetWin = targetDoc.defaultView || window;

  const inputs = Array.from(
    modal.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="password"], input[type="number"], input:not([type])'
    )
  );

  if (inputs.length === 1) {
    const input = inputs[0];
    input.focus();
    if (input.value.length < 4) {
      setNativeInputValue(input, input.value + digitStr);
    }
  } else if (inputs.length >= 4) {
    const activeIndex = inputs.findIndex((inp) => inp === targetDoc.activeElement || inp.value === "");
    const targetInput = activeIndex !== -1 ? inputs[activeIndex] : inputs[inputs.length - 1];
    targetInput.focus();
    setNativeInputValue(targetInput, digitStr);

    if (activeIndex !== -1 && activeIndex < inputs.length - 1) {
      inputs[activeIndex + 1].focus();
    }
  }

  const activeEl = (targetDoc.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, digitStr, code, keyCode);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, digitStr, code, keyCode);
  }
  dispatchKeyEvent(targetWin, digitStr, code, keyCode);
}

export function sendBackspace(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const targetDoc = modal.ownerDocument || document;
  const targetWin = targetDoc.defaultView || window;
  const inputs = Array.from(
    modal.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="password"], input[type="number"], input:not([type])'
    )
  );

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
    if (targetIndex === -1 && targetDoc.activeElement) {
      targetIndex = inputs.indexOf(targetDoc.activeElement as HTMLInputElement);
    }
    if (targetIndex !== -1) {
      const targetInput = inputs[targetIndex];
      setNativeInputValue(targetInput, "");
      targetInput.focus();
    }
  }

  const activeEl = (targetDoc.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, "Backspace", "Backspace", 8);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, "Backspace", "Backspace", 8);
  }
  dispatchKeyEvent(targetWin, "Backspace", "Backspace", 8);
}

export function sendClear(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const inputs = Array.from(
    modal.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="password"], input[type="number"], input:not([type])'
    )
  );

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

export function sendConfirm(modalElement?: HTMLElement | null): void {
  const modal = modalElement || getFamilyViewModalContainer() || document.body;
  const targetDoc = modal.ownerDocument || document;
  const targetWin = targetDoc.defaultView || window;

  const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>("button, div[role='button']"));
  const confirmBtn = buttons.find((btn) => {
    const text = (btn.innerText || btn.textContent || "").toLowerCase().trim();
    return text === "confirm" || text === "confirmer" || text === "ok" || text === "valider";
  });

  if (confirmBtn) {
    confirmBtn.click();
  }

  const activeEl = (targetDoc.activeElement as HTMLElement) || modal;
  dispatchKeyEvent(activeEl, "Enter", "Enter", 13);
  if (modal !== activeEl) {
    dispatchKeyEvent(modal, "Enter", "Enter", 13);
  }
  dispatchKeyEvent(targetWin, "Enter", "Enter", 13);
}
