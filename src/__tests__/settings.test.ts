import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSettings,
  saveSettings,
  getSettings,
  subscribeSettings,
  DEFAULT_SETTINGS,
} from "../services/settings";

describe("Settings Service", () => {
  beforeEach(() => {
    localStorage.clear();
    saveSettings(DEFAULT_SETTINGS);
  });

  it("should initialize with default settings", () => {
    const settings = getSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.autoSubmitOn4Digits).toBe(true);
    expect(settings.buttonSize).toBe("medium");
  });

  it("should save and load settings from localStorage", () => {
    saveSettings({ enabled: false, buttonSize: "large", compactMode: true });
    const loaded = loadSettings();
    expect(loaded.enabled).toBe(false);
    expect(loaded.buttonSize).toBe("large");
    expect(loaded.compactMode).toBe(true);
  });

  it("should notify subscribers on change", () => {
    let notified = false;
    const unsubscribe = subscribeSettings((updated) => {
      if (updated.buttonSize === "small") {
        notified = true;
      }
    });

    saveSettings({ buttonSize: "small" });
    expect(notified).toBe(true);
    unsubscribe();
  });
});
