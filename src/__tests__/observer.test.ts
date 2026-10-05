import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isFamilyViewModal,
  findFamilyViewModalInDoc,
  mountNumpadInDoc,
  unmountNumpadInDoc,
  startObserver,
  stopObserver,
  getAllSteamWindows,
} from "../services/observer";
import { saveSettings } from "../services/settings";

describe("Observer Service", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    saveSettings({ enabled: true });
  });

  afterEach(() => {
    stopObserver();
    vi.restoreAllMocks();
  });

  it("should correctly discover windows", () => {
    const windows = getAllSteamWindows();
    expect(windows.length).toBeGreaterThan(0);
    expect(windows).toContain(window);
  });

  it("should correctly identify Family View modal elements", () => {
    const validModal = document.createElement("div");
    validModal.innerHTML = `
      <h2>Family View</h2>
      <p>Enter your PIN below to exit Family View.</p>
    `;
    expect(isFamilyViewModal(validModal)).toBe(true);

    const frenchModal = document.createElement("div");
    frenchModal.innerHTML = `
      <h2>Mode Famille</h2>
      <p>Entrez votre code PIN pour quitter le mode famille.</p>
    `;
    expect(isFamilyViewModal(frenchModal)).toBe(true);

    const parentalClassModal = document.createElement("div");
    parentalClassModal.className = "ParentalPINDialog";
    expect(isFamilyViewModal(parentalClassModal)).toBe(true);

    const unrelatedModal = document.createElement("div");
    unrelatedModal.innerHTML = `
      <h2>Settings</h2>
      <p>Configure audio and display settings.</p>
    `;
    expect(isFamilyViewModal(unrelatedModal)).toBe(false);
  });

  it("should find the modal in DOM and mount Numpad", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content ParentalPINDialog";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <div class="DigitInputField"></div>
      <div class="DialogControlsSection">
        <button>Confirm</button>
      </div>
    `;
    document.body.appendChild(modal);

    const found = findFamilyViewModalInDoc(document);
    expect(found).not.toBeNull();

    mountNumpadInDoc(document, found!);
    const injected = modal.querySelector("#decky-family-view-numpad-container");
    expect(injected).not.toBeNull();

    unmountNumpadInDoc(document);
    expect(modal.querySelector("#decky-family-view-numpad-container")).toBeNull();
  });

  it("should start and stop observer cleanly", () => {
    expect(() => startObserver()).not.toThrow();
    expect(() => stopObserver()).not.toThrow();
  });
});
