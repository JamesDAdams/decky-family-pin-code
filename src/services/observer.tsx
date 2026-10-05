import { createRoot, Root } from "react-dom/client";
import { Numpad } from "../components/Numpad";
import { getSettings, subscribeSettings } from "./settings";
import { isDeckyUIElement } from "./inputSimulator";
import {
  injectIntoSteamTabs,
  scanInSteamTabs,
  updateSettingsInSteamTabs,
  cleanupInSteamTabs,
} from "./spInjector";

const CONTAINER_ID = "decky-family-view-numpad-container";

interface ActiveInstance {
  modal: HTMLElement;
  container: HTMLElement;
  root: Root;
}

let activeInstance: ActiveInstance | null = null;
let mutationObserver: MutationObserver | null = null;
let settingsUnsubscribe: (() => void) | null = null;

/**
 * Checks if a given HTML element looks like the SteamOS Family View PIN modal.
 */
export function isFamilyViewModal(el: HTMLElement): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (isDeckyUIElement(el)) return false;

  const text = (el.innerText || el.textContent || "").toLowerCase();

  const hasFamilyKeyword =
    text.includes("family view") ||
    text.includes("mode famille") ||
    text.includes("parental") ||
    text.includes("contrôle parental") ||
    text.includes("famille");

  const hasPinKeyword =
    text.includes("pin") ||
    text.includes("enter your pin") ||
    text.includes("entrez votre pin") ||
    text.includes("code pin") ||
    text.includes("exit family view") ||
    text.includes("quitter le mode famille") ||
    text.includes("enter") ||
    text.includes("entrer");

  const hasPinBoxes =
    el.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], input:not([type]), [class*="PinDigit"], [class*="pin_digit"]').length >= 1;

  return (hasFamilyKeyword && hasPinKeyword) || (hasFamilyKeyword && hasPinBoxes);
}

/**
 * Scans the DOM to find the active Family View modal.
 */
export function findFamilyViewModal(): HTMLElement | null {
  const dialogSelectors = [
    'div[role="dialog"]',
    'div[class*="DialogContent"]',
    'div[class*="ModalPosition"]',
    'div[class*="Modal_"]',
    'div[class*="Dialog_"]',
    'div[class*="PinDialog"]',
    'div[class*="Parental"]',
    '.DialogControlsSection',
    '.DialogContent',
  ];

  const dialogs = Array.from(document.querySelectorAll<HTMLElement>(dialogSelectors.join(", ")));

  for (const dialog of dialogs) {
    if (isDeckyUIElement(dialog)) continue;
    if (isFamilyViewModal(dialog)) {
      const container =
        dialog.closest<HTMLElement>('div[role="dialog"], div[class*="Modal_"], div[class*="Dialog_"]') ||
        dialog;
      if (!isDeckyUIElement(container)) {
        return container;
      }
    }
  }

  const popups = Array.from(document.querySelectorAll<HTMLElement>("body > div, #root > div"));
  for (const popup of popups) {
    if (isDeckyUIElement(popup)) continue;
    if (isFamilyViewModal(popup)) {
      return popup;
    }
  }

  return null;
}

/**
 * Mounts the Numpad component inside the detected Family View modal.
 */
export function mountNumpad(modal: HTMLElement): void {
  const settings = getSettings();
  if (!settings.enabled) {
    return;
  }

  if (modal.querySelector(`#${CONTAINER_ID}`)) {
    return;
  }

  if (activeInstance) {
    unmountNumpad();
  }

  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.style.width = "100%";
  container.style.display = "flex";
  container.style.justifyContent = "center";
  container.style.zIndex = "99999";
  container.style.marginTop = "8px";
  container.style.marginBottom = "8px";

  const buttonsSection = modal.querySelector<HTMLElement>(
    'div[class*="DialogControlsSection"], div[class*="DialogFooter"], div[class*="ButtonsRow"], div[class*="ModalFooter"]'
  );

  const inputsSection = modal.querySelector<HTMLElement>(
    'div[class*="PinEntry"], div[class*="PinInput"], div[class*="InputsRow"], div[class*="DialogBody"]'
  );

  if (buttonsSection && buttonsSection.parentNode) {
    buttonsSection.parentNode.insertBefore(container, buttonsSection);
  } else if (inputsSection && inputsSection.parentNode) {
    inputsSection.parentNode.insertBefore(container, inputsSection.nextSibling);
  } else {
    modal.appendChild(container);
  }

  const root = createRoot(container);
  root.render(<Numpad modalElement={modal} />);

  activeInstance = {
    modal,
    container,
    root,
  };
}

/**
 * Unmounts the Numpad component and cleans up the DOM.
 */
export function unmountNumpad(): void {
  if (activeInstance) {
    try {
      activeInstance.root.unmount();
      if (activeInstance.container.parentNode) {
        activeInstance.container.parentNode.removeChild(activeInstance.container);
      }
    } catch (err) {
      console.warn("[FamilyViewNumpad] Cleanup error:", err);
    }
    activeInstance = null;
  }
}

/**
 * Checks the DOM state: mounts if modal found, unmounts if modal gone.
 */
export function checkAndInject(): void {
  const settings = getSettings();
  if (!settings.enabled) {
    if (activeInstance) {
      unmountNumpad();
    }
    return;
  }

  const modal = findFamilyViewModal();
  if (modal) {
    if (!activeInstance || activeInstance.modal !== modal || !document.body.contains(activeInstance.container)) {
      mountNumpad(modal);
    }
  } else {
    if (activeInstance && !document.body.contains(activeInstance.modal)) {
      unmountNumpad();
    }
  }

  // Also trigger scan in Steam tabs (SP / GamepadUI)
  scanInSteamTabs();
}

/**
 * Starts observing DOM changes and injects into Steam tabs.
 */
export function startObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  // 1. Inject into Steam tabs (SP / Main Window)
  injectIntoSteamTabs();

  // 2. Subscribe to settings changes
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
  }
  settingsUnsubscribe = subscribeSettings((settings) => {
    updateSettingsInSteamTabs(settings);
    if (!settings.enabled) {
      unmountNumpad();
    } else {
      checkAndInject();
    }
  });

  // 3. Local MutationObserver (for preview / single window fallback)
  mutationObserver = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
        shouldCheck = true;
        break;
      }
    }
    if (shouldCheck) {
      checkAndInject();
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  checkAndInject();
}

/**
 * Stops observing DOM and cleans up all active instances and subscriptions.
 */
export function stopObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
    settingsUnsubscribe = null;
  }
  unmountNumpad();
  cleanupInSteamTabs();
}
