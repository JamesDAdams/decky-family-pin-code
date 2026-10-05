export interface PluginSettings {
  enabled: boolean;
  compactMode: boolean;
  autoSubmitOn4Digits: boolean;
  hapticFeedback: boolean;
  buttonSize: "small" | "medium" | "large";
}

const STORAGE_KEY = "family_view_numpad_settings";

export const DEFAULT_SETTINGS: PluginSettings = {
  enabled: true,
  compactMode: false,
  autoSubmitOn4Digits: true,
  hapticFeedback: true,
  buttonSize: "medium",
};

type Listener = (settings: PluginSettings) => void;
const listeners: Set<Listener> = new Set();

let currentSettings: PluginSettings = { ...DEFAULT_SETTINGS };

export function loadSettings(): PluginSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("[FamilyViewNumpad] Failed to load settings:", e);
  }
  return currentSettings;
}

export function saveSettings(settings: Partial<PluginSettings>): PluginSettings {
  try {
    currentSettings = { ...currentSettings, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    listeners.forEach((listener) => {
      try {
        listener(currentSettings);
      } catch (err) {
        console.error("[FamilyViewNumpad] Error in settings listener:", err);
      }
    });
  } catch (e) {
    console.error("[FamilyViewNumpad] Failed to save settings:", e);
  }
  return currentSettings;
}

export function getSettings(): PluginSettings {
  return currentSettings;
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
