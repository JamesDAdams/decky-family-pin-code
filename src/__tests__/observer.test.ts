import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isFamilyViewModal,
  findFamilyViewModal,
  mountNumpad,
  unmountNumpad,
  startObserver,
  stopObserver,
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

    const unrelatedModal = document.createElement("div");
    unrelatedModal.innerHTML = `
      <h2>Settings</h2>
      <p>Configure audio and display settings.</p>
    `;
    expect(isFamilyViewModal(unrelatedModal)).toBe(false);
  });

  it("should ignore Decky QAM and preview elements to prevent false positives", () => {
    const deckyQAM = document.createElement("div");
    deckyQAM.id = "decky-root";
    deckyQAM.innerHTML = `
      <div class="QuickAccessMenu">
        <h2>Family View Numpad (Preview)</h2>
        <p>Enter your PIN below to exit Family View.</p>
      </div>
    `;
    document.body.appendChild(deckyQAM);

    expect(isFamilyViewModal(deckyQAM)).toBe(false);
    expect(findFamilyViewModal()).toBeNull();
  });

  it("should find the modal in DOM and mount Numpad", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <div class="DialogSubtitle">Enter your PIN below</div>
      <div class="PinEntry"></div>
      <div class="DialogControlsSection">
        <button>Confirm</button>
      </div>
    `;
    document.body.appendChild(modal);

    const found = findFamilyViewModal();
    expect(found).not.toBeNull();

    mountNumpad(found!);
    const injected = modal.querySelector("#decky-family-view-numpad-container");
    expect(injected).not.toBeNull();

    unmountNumpad();
    expect(modal.querySelector("#decky-family-view-numpad-container")).toBeNull();
  });

  it("should automatically unmount when settings are disabled", () => {
    startObserver();

    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <div class="DialogSubtitle">Enter your PIN below</div>
    `;
    document.body.appendChild(modal);

    // Initial mount
    mountNumpad(modal);
    expect(modal.querySelector("#decky-family-view-numpad-container")).not.toBeNull();

    // Disable via settings
    saveSettings({ enabled: false });
    expect(modal.querySelector("#decky-family-view-numpad-container")).toBeNull();
  });
});
