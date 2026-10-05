import { FC, useState } from "react";
import { Numpad } from "./Numpad";
import { toaster } from "@decky/api";

export const NumpadModalPreview: FC = () => {
  const [pin, setPin] = useState<string>("");

  const handleDigit = (digit: number) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        toaster.toast({
          title: "PIN Entered",
          body: `PIN: **** (Simulated Unlock)`,
        });
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const handleConfirm = () => {
    toaster.toast({
      title: "Confirmation",
      body: pin.length === 4 ? `PIN submitted successfully!` : "Please enter 4 digits",
    });
    setPin("");
  };

  return (
    <div
      className="family-view-numpad-preview"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "rgba(10, 15, 25, 0.9)",
        padding: "16px",
        borderRadius: "12px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "rgba(255, 255, 255, 0.15)",
        marginTop: "10px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: "#ffffff", fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
        Family View (Preview)
      </div>
      <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", marginBottom: "12px" }}>
        Enter your PIN below to exit Family View
      </div>

      {/* 4 PIN boxes simulation */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < pin.length;
          return (
            <div
              key={index}
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

      {/* Interactive Numpad preview */}
      <Numpad
        isPreview={true}
        onDigitPress={handleDigit}
        onBackspacePress={handleBackspace}
        onClearPress={handleClear}
        onConfirmPress={handleConfirm}
      />
    </div>
  );
};
