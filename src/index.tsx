import { definePlugin } from "@decky/api";
import { staticClasses } from "@decky/ui";
import { FaKeyboard } from "react-icons/fa";
import { SettingsPanel } from "./components/SettingsPanel";
import { loadSettings } from "./services/settings";
import { startObserver, stopObserver } from "./services/observer";
import { initParentalPatch, removeParentalPatch } from "./patches/parentalPatch";

export default definePlugin(() => {
  console.log("[FamilyViewNumpad] Initializing plugin...");

  // Load saved settings
  loadSettings();

  // 1. Initialize React tree patcher
  initParentalPatch();

  // 2. Start DOM multi-window observer
  try {
    startObserver();
  } catch (err) {
    console.error("[FamilyViewNumpad] Failed to start observer:", err);
  }

  return {
    name: "Family View Numpad",
    titleView: <div className={staticClasses.Title}>Family View Numpad</div>,
    content: <SettingsPanel />,
    icon: <FaKeyboard />,
    onDismount() {
      console.log("[FamilyViewNumpad] Dismounting plugin...");
      removeParentalPatch();
      stopObserver();
    },
  };
});
