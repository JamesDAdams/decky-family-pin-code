import { FC, useState, useEffect } from "react";
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
import { NumpadModalPreview } from "./NumpadModalPreview";

export const SettingsPanel: FC = () => {
  const [settings, setSettings] = useState<PluginSettings>(getSettings());
  const [showPreview, setShowPreview] = useState<boolean>(false);

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
      body: "Scanning for Family View modal in Steam...",
    });
  };

  return (
    <div>
      <PanelSection title="Status & Activation">
        <PanelSectionRow>
          <ToggleField
            label="Enable Virtual Numpad"
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
            {showPreview ? "Hide Preview" : "Test Numpad (Interactive Preview)"}
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
