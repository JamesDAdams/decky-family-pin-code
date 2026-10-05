import {
  afterPatch,
  findModuleDetailsByExport,
  findInReactTree,
  Patch,
} from "@decky/ui";
import React from "react";
import { Numpad } from "../components/Numpad";
import { getSettings } from "../services/settings";

let parentalPatch: Patch | undefined;
let digitFieldPatch: Patch | undefined;

/**
 * Patches Steam's Parental PIN dialog and DigitInputField React components
 * so that the Numpad is rendered natively inside the modal.
 */
export function initParentalPatch(): void {
  try {
    // 1. Find the module exporting ParentalPINDialog
    const [mod, , expName] = findModuleDetailsByExport(
      (e) =>
        typeof e === "function" &&
        (e.toString().includes("FamilyView_UnlockDialog") ||
          e.toString().includes("UnlockParentalLock") ||
          (e.toString().includes("validateDigit") && e.toString().includes("digits")))
    );

    if (mod && expName) {
      console.log(`[FamilyViewNumpad] Found Parental PIN component (${expName}), applying React patch...`);

      parentalPatch = afterPatch(mod, expName, (_args: any, ret: any) => {
        const settings = getSettings();
        if (!settings.enabled) return ret;

        // Check if Numpad already present
        if (findInReactTree(ret, (x) => x?.type === Numpad)) {
          return ret;
        }

        try {
          // Wrap with Numpad
          const numpadElement = React.createElement(Numpad, { isPreview: false });

          if (ret?.props?.children) {
            if (Array.isArray(ret.props.children)) {
              ret.props.children.push(numpadElement);
            } else {
              ret.props.children = [ret.props.children, numpadElement];
            }
          }
        } catch (err) {
          console.warn("[FamilyViewNumpad] Error injecting Numpad into React tree:", err);
        }

        return ret;
      });
    } else {
      console.log("[FamilyViewNumpad] React component module not found, relying on DOM observer.");
    }

    // 2. Also try finding DigitInputField component
    const [digitMod, , digitExpName] = findModuleDetailsByExport(
      (e) =>
        typeof e === "function" &&
        e.toString().includes("SegmentedInput") &&
        e.toString().includes("allowCharacter")
    );

    if (digitMod && digitExpName) {
      digitFieldPatch = afterPatch(digitMod, digitExpName, (_args: any, ret: any) => {
        const settings = getSettings();
        if (!settings.enabled) return ret;
        try {
          const numpadElement = React.createElement(Numpad, { isPreview: false });
          return React.createElement(React.Fragment, null, ret, numpadElement);
        } catch {
          return ret;
        }
      });
    }
  } catch (e) {
    console.warn("[FamilyViewNumpad] React patch initialization error:", e);
  }
}

export function removeParentalPatch(): void {
  if (parentalPatch) {
    parentalPatch.unpatch();
    parentalPatch = undefined;
  }
  if (digitFieldPatch) {
    digitFieldPatch.unpatch();
    digitFieldPatch = undefined;
  }
}
