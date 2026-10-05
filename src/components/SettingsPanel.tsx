import { FC, useState, useEffect, useCallback } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
  DropdownItem,
  ButtonItem,
  SingleDropdownOption,
} from "@decky/ui";
import { toaster } from "@decky/api";
import {
  getSettings,
  saveSettings,
  subscribeSettings,
  PluginSettings,
} from "../services/settings";
import { checkAndInject } from "../services/observer";
import { injectIntoSteamTabs, scanInSteamTabs } from "../services/spInjector";
import { getParentalAPI, unlockWithParentalAPI } from "../services/inputSimulator";
import { NumpadModalPreview } from "./NumpadModalPreview";
import { Numpad } from "./Numpad";

export const SettingsPanel: FC = () => {
  const [settings, setSettings] = useState<PluginSettings>(getSettings());
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [quickPin, setQuickPin] = useState<string>("");

  useEffect(() => {
    return subscribeSettings((newSettings) => {
      setSettings({ ...newSettings });
    });
  }, []);

  const handleToggleEnabled = (enabled: boolean) => {
    saveSettings({ enabled });
  };

  const handleToggleAutoSubmit = (autoSubmitOn4Digits: boolean) => {
    saveSettings({ autoSubmitOn4Digits });
  };

  const handleToggleHaptic = (hapticFeedback: boolean) => {
    saveSettings({ hapticFeedback });
  };

  const handleToggleCompact = (compactMode: boolean) => {
    saveSettings({ compactMode });
  };

  const buttonSizeOptions: SingleDropdownOption[] = [
    { data: "small", label: "Small" },
    { data: "medium", label: "Medium (Standard)" },
    { data: "large", label: "Large (Touch)" },
  ];

  const handleSizeChange = (option: SingleDropdownOption) => {
    saveSettings({ buttonSize: option.data as "small" | "medium" | "large" });
  };

  const handleManualScan = async () => {
    await injectIntoSteamTabs(settings);
    await scanInSteamTabs();
    checkAndInject();
    toaster.toast({
      title: "Family View Numpad",
      body: "Scanned all Steam windows & injected keypad.",
    });
  };

  const handleQuickUnlockDigit = useCallback(
    async (digit: number) => {
      const nextPin = quickPin.length >= 4 ? String(digit) : quickPin + digit;
      setQuickPin(nextPin);

      if (nextPin.length === 4) {
        const success = await unlockWithParentalAPI(nextPin);
        if (success) {
          toaster.toast({
            title: "Family View",
            body: "Family View successfully unlocked!",
          });
          setQuickPin("");
        } else {
          toaster.toast({
            title: "Family View",
            body: "Incorrect PIN or unlock failed.",
          });
          setQuickPin("");
        }
      }
    },
    [quickPin]
  );

  const handleQuickUnlockConfirm = useCallback(async () => {
    if (quickPin.length === 4) {
      const success = await unlockWithParentalAPI(quickPin);
      if (success) {
        toaster.toast({
          title: "Family View",
          body: "Family View successfully unlocked!",
        });
      } else {
        toaster.toast({
          title: "Family View",
          body: "Incorrect PIN or unlock failed.",
        });
      }
      setQuickPin("");
    } else {
      toaster.toast({
        title: "Family View",
        body: "Please enter a 4-digit PIN.",
      });
    }
  }, [quickPin]);

  const handleLockParental = async () => {
    const api = getParentalAPI();
    if (api?.LockParentalLock) {
      try {
        await api.LockParentalLock();
        toaster.toast({
          title: "Family View",
          body: "Family View locked.",
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div>
      <PanelSection title="Quick PIN Unlocker">
        <PanelSectionRow>
          <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", marginBottom: "6px" }}>
            Unlock Family View directly from this menu:
          </div>
        </PanelSectionRow>

        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "8px 0" }}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < quickPin.length;
              return (
                <div
                  key={idx}
                  style={{
                    width: "36px",
                    height: "44px",
                    borderRadius: "6px",
                    backgroundColor: isFilled ? "rgba(26, 159, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                    borderWidth: isFilled ? "2px" : "1px",
                    borderStyle: "solid",
                    borderColor: isFilled ? "#1a9fff" : "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: "#ffffff",
                  }}
                >
                  {isFilled ? "●" : ""}
                </div>
              );
            })}
          </div>
        </PanelSectionRow>

        <PanelSectionRow>
          <Numpad
            isPreview={true}
            onDigitPress={handleQuickUnlockDigit}
            onBackspacePress={() => setQuickPin((p) => p.slice(0, -1))}
            onClearPress={() => setQuickPin("")}
            onConfirmPress={handleQuickUnlockConfirm}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleLockParental}>
            Lock Family View
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Status & Activation">
        <PanelSectionRow>
          <ToggleField
            label="Enable Modal Keypad"
            description="Automatically display the on-screen keypad on the Family View PIN dialog"
            checked={settings.enabled}
            onChange={handleToggleEnabled}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Input Preferences">
        <PanelSectionRow>
          <ToggleField
            label="Auto-Submit (4 Digits)"
            description="Automatically submit the PIN once the 4th digit is entered"
            checked={settings.autoSubmitOn4Digits}
            onChange={handleToggleAutoSubmit}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ToggleField
            label="Haptic Feedback"
            description="Subtle vibration when tapping buttons"
            checked={settings.hapticFeedback}
            onChange={handleToggleHaptic}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ToggleField
            label="Compact Mode"
            description="Reduces padding for smaller screens"
            checked={settings.compactMode}
            onChange={handleToggleCompact}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <DropdownItem
            label="Button Size"
            rgOptions={buttonSizeOptions}
            selectedOption={settings.buttonSize}
            onChange={handleSizeChange}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Tools & Preview">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? "Hide Preview" : "Test Modal Keypad (Preview)"}
          </ButtonItem>
        </PanelSectionRow>

        {showPreview && (
          <PanelSectionRow>
            <NumpadModalPreview />
          </PanelSectionRow>
        )}

        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleManualScan}
          >
            Force Modal Detection Scan
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
