import { FC, useState, useCallback, useEffect, Fragment, CSSProperties } from "react";
import { FaBackspace, FaTimes, FaCheck } from "react-icons/fa";
import {
  sendDigit,
  sendBackspace,
  sendClear,
  sendConfirm,
  unlockWithParentalAPI,
} from "../services/inputSimulator";
import { getSettings, subscribeSettings, PluginSettings } from "../services/settings";

interface NumpadProps {
  modalElement?: HTMLElement | null;
  onDigitPress?: (digit: number) => void;
  onBackspacePress?: () => void;
  onClearPress?: () => void;
  onConfirmPress?: () => void;
  isPreview?: boolean;
}

export const Numpad: FC<NumpadProps> = ({
  modalElement,
  onDigitPress,
  onBackspacePress,
  onClearPress,
  onConfirmPress,
  isPreview = false,
}) => {
  const [settings, setSettings] = useState<PluginSettings>(getSettings());
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>("");

  useEffect(() => {
    return subscribeSettings((newSettings) => {
      setSettings({ ...newSettings });
    });
  }, []);

  const triggerHaptic = useCallback(() => {
    if (settings.hapticFeedback && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {
        // Ignore if vibration not permitted
      }
    }
  }, [settings.hapticFeedback]);

  const handleDigit = useCallback(
    async (digit: number) => {
      triggerHaptic();
      setPressedKey(String(digit));
      setTimeout(() => setPressedKey(null), 120);

      const nextPin = enteredPin.length >= 4 ? String(digit) : enteredPin + digit;
      setEnteredPin(nextPin);

      if (!isPreview) {
        sendDigit(digit, modalElement);
      }
      onDigitPress?.(digit);

      if (nextPin.length === 4) {
        if (!isPreview) {
          // Attempt native Steam Parental unlock
          unlockWithParentalAPI(nextPin);
        }

        if (settings.autoSubmitOn4Digits) {
          setTimeout(() => {
            if (!isPreview) {
              sendConfirm(modalElement);
            }
            onConfirmPress?.();
            setEnteredPin("");
          }, 150);
        }
      }
    },
    [enteredPin, modalElement, onDigitPress, onConfirmPress, isPreview, settings.autoSubmitOn4Digits, triggerHaptic]
  );

  const handleBackspace = useCallback(() => {
    triggerHaptic();
    setPressedKey("backspace");
    setTimeout(() => setPressedKey(null), 120);

    setEnteredPin((prev) => prev.slice(0, -1));

    if (!isPreview) {
      sendBackspace(modalElement);
    }
    onBackspacePress?.();
  }, [modalElement, onBackspacePress, isPreview, triggerHaptic]);

  const handleClear = useCallback(() => {
    triggerHaptic();
    setPressedKey("clear");
    setTimeout(() => setPressedKey(null), 120);

    setEnteredPin("");

    if (!isPreview) {
      sendClear(modalElement);
    }
    onClearPress?.();
  }, [modalElement, onClearPress, isPreview, triggerHaptic]);

  const handleConfirm = useCallback(async () => {
    triggerHaptic();
    setPressedKey("confirm");
    setTimeout(() => setPressedKey(null), 120);

    if (!isPreview) {
      if (enteredPin.length === 4) {
        await unlockWithParentalAPI(enteredPin);
      }
      sendConfirm(modalElement);
    }
    onConfirmPress?.();
  }, [enteredPin, modalElement, onConfirmPress, isPreview, triggerHaptic]);

  const buttonSizeStyle = () => {
    switch (settings.buttonSize) {
      case "small":
        return { height: "46px", fontSize: "19px", padding: "4px" };
      case "large":
        return { height: "64px", fontSize: "26px", padding: "10px" };
      case "medium":
      default:
        return { height: "54px", fontSize: "22px", padding: "6px" };
    }
  };

  const baseBtnStyle: CSSProperties = {
    ...buttonSizeStyle(),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    transition: "all 0.12s ease-in-out",
    outline: "none",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.3)",
  };

  const getDynamicBtnStyle = (key: string): CSSProperties => {
    const isPressed = pressedKey === key;
    const isFocused = focusedKey === key;

    if (isPressed) {
      return {
        backgroundColor: "#1a9fff",
        borderColor: "#66c0f4",
        transform: "scale(0.94)",
        boxShadow: "0 0 14px rgba(26, 159, 255, 0.8)",
      };
    }

    if (isFocused) {
      return {
        backgroundColor: "rgba(26, 159, 255, 0.35)",
        borderColor: "#1a9fff",
        boxShadow: "0 0 10px rgba(26, 159, 255, 0.6)",
        transform: "scale(1.02)",
      };
    }

    return {};
  };

  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  return (
    <div
      className="family-view-numpad"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: settings.compactMode ? "8px" : "14px",
        backgroundColor: "rgba(18, 25, 38, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "14px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "rgba(255, 255, 255, 0.12)",
        maxWidth: "360px",
        width: "100%",
        margin: "12px auto",
        boxSizing: "border-box",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {rows.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
            {row.map((digit) => {
              const keyStr = String(digit);
              return (
                <button
                  key={digit}
                  type="button"
                  tabIndex={0}
                  style={{
                    ...baseBtnStyle,
                    ...getDynamicBtnStyle(keyStr),
                  }}
                  onFocus={() => setFocusedKey(keyStr)}
                  onBlur={() => setFocusedKey((prev) => (prev === keyStr ? null : prev))}
                  onClick={() => handleDigit(digit)}
                >
                  {digit}
                </button>
              );
            })}
          </Fragment>
        ))}

        {/* Row 4: Clear (C), 0, Backspace */}
        <button
          type="button"
          tabIndex={0}
          title="Clear all"
          style={{
            ...baseBtnStyle,
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            borderColor: "rgba(239, 68, 68, 0.4)",
            color: "#fca5a5",
            ...getDynamicBtnStyle("clear"),
          }}
          onFocus={() => setFocusedKey("clear")}
          onBlur={() => setFocusedKey((prev) => (prev === "clear" ? null : prev))}
          onClick={handleClear}
        >
          <FaTimes style={{ fontSize: "18px" }} />
        </button>

        <button
          type="button"
          tabIndex={0}
          style={{
            ...baseBtnStyle,
            ...getDynamicBtnStyle("0"),
          }}
          onFocus={() => setFocusedKey("0")}
          onBlur={() => setFocusedKey((prev) => (prev === "0" ? null : prev))}
          onClick={() => handleDigit(0)}
        >
          0
        </button>

        <button
          type="button"
          tabIndex={0}
          title="Backspace"
          style={{
            ...baseBtnStyle,
            backgroundColor: "rgba(245, 158, 11, 0.2)",
            borderColor: "rgba(245, 158, 11, 0.4)",
            color: "#fcd34d",
            ...getDynamicBtnStyle("backspace"),
          }}
          onFocus={() => setFocusedKey("backspace")}
          onBlur={() => setFocusedKey((prev) => (prev === "backspace" ? null : prev))}
          onClick={handleBackspace}
        >
          <FaBackspace style={{ fontSize: "20px" }} />
        </button>
      </div>

      {/* Confirm Action Button */}
      <button
        type="button"
        tabIndex={0}
        style={{
          ...baseBtnStyle,
          height: "44px",
          fontSize: "16px",
          backgroundColor: "#1a9fff",
          borderColor: "#66c0f4",
          display: "flex",
          gap: "8px",
          marginTop: "2px",
          ...getDynamicBtnStyle("confirm"),
        }}
        onFocus={() => setFocusedKey("confirm")}
        onBlur={() => setFocusedKey((prev) => (prev === "confirm" ? null : prev))}
        onClick={handleConfirm}
      >
        <FaCheck style={{ fontSize: "14px" }} />
        <span>Confirm</span>
      </button>
    </div>
  );
};
