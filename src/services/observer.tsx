import { createRoot, Root } from "react-dom/client";
import { Numpad } from "../components/Numpad";
import { getSettings, subscribeSettings } from "./settings";
import { isDeckyUIElement, getFamilyViewModalContainer } from "./inputSimulator";
import {
  injectIntoSteamTabs,
  scanInSteamTabs,
  updateSettingsInSteamTabs,
  cleanupInSteamTabs,
} from "./spInjector";

const CONTAINER_ID = "decky-family-view-numpad-container";

export function getFocusNavController(): any {
  if (typeof window === "undefined") return null;
  return (window as any).GamepadNavTree?.m_context?.m_controller || (window as any).FocusNavController;
}

export function getGamepadNavigationTrees(): any[] {
  const focusNav = getFocusNavController();
  const context = focusNav?.m_ActiveContext || focusNav?.m_LastActiveContext;
  return context?.m_rgGamepadNavigationTrees || [];
}

export function findSP(): Window | null {
  if (typeof document !== "undefined" && document.title === "SP") return window;
  const navTrees = getGamepadNavigationTrees();
  if (Array.isArray(navTrees)) {
    const tree = navTrees.find((x: any) => x?.m_ID === "GamepadUI_Full_Root" || x?.m_ID === "root_1_");
    return tree?.Root?.Element?.ownerDocument?.defaultView || null;
  }
  return null;
}

interface ActiveMount {
  doc: Document;
  modal: HTMLElement;
  container: HTMLElement;
  root: Root;
}

const activeMounts: Map<Document, ActiveMount> = new Map();
const activeObservers: Map<Document, MutationObserver> = new Map();
let settingsUnsubscribe: (() => void) | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Discovers all active Steam Windows across the CEF environment,
 * including SP, popup windows, and GamepadNavTree documents.
 */
export function getAllSteamWindows(): Window[] {
  const windows = new Set<Window>();

  if (typeof window !== "undefined") {
    windows.add(window);
  }

  try {
    const sp = findSP();
    if (sp) {
      windows.add(sp);
    }
  } catch (e) {}

  try {
    const navTrees = getGamepadNavigationTrees();
    if (Array.isArray(navTrees)) {
      for (const tree of navTrees) {
        const win = tree?.Root?.Element?.ownerDocument?.defaultView;
        if (win) {
          windows.add(win);
        }
      }
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    if (window.opener) windows.add(window.opener);
    if (window.top) windows.add(window.top);
    if (window.parent) windows.add(window.parent);
  }

  return Array.from(windows);
}

/**
 * Checks if a given HTML element is the SteamOS Family View PIN modal.
 */
export function isFamilyViewModal(el: HTMLElement): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (isDeckyUIElement(el)) return false;

  const text = (el.innerText || el.textContent || "").toLowerCase();

  const isClassMatch =
    el.className &&
    typeof el.className === "string" &&
    (el.className.includes("ParentalPINDialog") || el.className.includes("DigitInputField"));

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
    el.querySelectorAll('input, [class*="PinDigit"], [class*="pin_digit"], [class*="DigitInputField"]').length >= 1;

  return isClassMatch || (hasFamilyKeyword && hasPinKeyword) || (hasFamilyKeyword && hasPinBoxes);
}

/**
 * Scans a document to find the active Family View modal.
 */
export function findFamilyViewModalInDoc(doc: Document): HTMLElement | null {
  return getFamilyViewModalContainer(doc);
}

/**
 * Mounts the Numpad component inside the detected Family View modal.
 */
export function mountNumpadInDoc(doc: Document, modal: HTMLElement): void {
  const settings = getSettings();
  if (!settings.enabled) {
    return;
  }

  if (modal.querySelector(`#${CONTAINER_ID}`)) {
    return;
  }

  const existing = activeMounts.get(doc);
  if (existing) {
    unmountNumpadInDoc(doc);
  }

  const container = doc.createElement("div");
  container.id = CONTAINER_ID;
  container.style.width = "100%";
  container.style.display = "flex";
  container.style.justifyContent = "center";
  container.style.zIndex = "99999";
  container.style.marginTop = "8px";
  container.style.marginBottom = "8px";

  // Find insertion point inside the modal
  const buttonsSection = modal.querySelector<HTMLElement>(
    'div[class*="DialogControlsSection"], div[class*="DialogFooter"], div[class*="ButtonsRow"], div[class*="ModalFooter"]'
  );

  const inputsSection = modal.querySelector<HTMLElement>(
    'div[class*="PinEntry"], div[class*="PinInput"], div[class*="DigitInputField"], div[class*="InputsRow"], div[class*="DialogBody"]'
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

  activeMounts.set(doc, {
    doc,
    modal,
    container,
    root,
  });
}

/**
 * Unmounts the Numpad component for a specific document.
 */
export function unmountNumpadInDoc(doc: Document): void {
  const mount = activeMounts.get(doc);
  if (mount) {
    try {
      mount.root.unmount();
      if (mount.container.parentNode) {
        mount.container.parentNode.removeChild(mount.container);
      }
    } catch (err) {
      console.warn("[FamilyViewNumpad] Unmount error:", err);
    }
    activeMounts.delete(doc);
  }
}

/**
 * Checks all discovered Steam documents and injects if modal is open.
 */
export function scanAndInjectAllDocuments(): void {
  const settings = getSettings();
  if (!settings.enabled) {
    for (const doc of Array.from(activeMounts.keys())) {
      unmountNumpadInDoc(doc);
    }
    return;
  }

  const windows = getAllSteamWindows();
  for (const win of windows) {
    const doc = win?.document;
    if (!doc || !doc.body) continue;

    // Ensure MutationObserver is attached to this document
    if (!activeObservers.has(doc)) {
      const obs = new MutationObserver(() => {
        const modal = findFamilyViewModalInDoc(doc);
        if (modal) {
          const mount = activeMounts.get(doc);
          if (!mount || mount.modal !== modal || !doc.body.contains(mount.container)) {
            mountNumpadInDoc(doc, modal);
          }
        } else {
          const mount = activeMounts.get(doc);
          if (mount && !doc.body.contains(mount.modal)) {
            unmountNumpadInDoc(doc);
          }
        }
      });

      obs.observe(doc.body, { childList: true, subtree: true });
      activeObservers.set(doc, obs);
    }

    // Check modal presence now
    const modal = findFamilyViewModalInDoc(doc);
    if (modal) {
      const mount = activeMounts.get(doc);
      if (!mount || mount.modal !== modal || !doc.body.contains(mount.container)) {
        mountNumpadInDoc(doc, modal);
      }
    } else {
      const mount = activeMounts.get(doc);
      if (mount && !doc.body.contains(mount.modal)) {
        unmountNumpadInDoc(doc);
      }
    }
  }

  // Also trigger tab-level injection
  scanInSteamTabs();
}

/**
 * Starts observing DOM changes across all Steam windows and tabs.
 */
export function startObserver(): void {
  // 1. Inject into Steam tabs (SP / Main Window)
  injectIntoSteamTabs();

  // 2. Subscribe to settings changes
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
  }
  settingsUnsubscribe = subscribeSettings((settings) => {
    updateSettingsInSteamTabs(settings);
    if (!settings.enabled) {
      for (const doc of Array.from(activeMounts.keys())) {
        unmountNumpadInDoc(doc);
      }
    } else {
      scanAndInjectAllDocuments();
    }
  });

  // 3. Scan all discovered documents immediately
  scanAndInjectAllDocuments();

  // 4. Periodically refresh windows list
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  pollInterval = setInterval(scanAndInjectAllDocuments, 1500);
}

/**
 * Stops observing DOM and cleans up all active instances and subscriptions.
 */
export function stopObserver(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
    settingsUnsubscribe = null;
  }

  for (const obs of Array.from(activeObservers.values())) {
    obs.disconnect();
  }
  activeObservers.clear();

  for (const doc of Array.from(activeMounts.keys())) {
    unmountNumpadInDoc(doc);
  }
  activeMounts.clear();

  cleanupInSteamTabs();
}

/**
 * Aliases for backwards compatibility and manual trigger
 */
export const checkAndInject = scanAndInjectAllDocuments;
export const findFamilyViewModal = () => findFamilyViewModalInDoc(typeof document !== "undefined" ? document : (null as any));
export const mountNumpad = (modal: HTMLElement) => mountNumpadInDoc(modal?.ownerDocument || document, modal);
export const unmountNumpad = () => unmountNumpadInDoc(typeof document !== "undefined" ? document : (null as any));
