import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Numpad } from "../components/Numpad";

describe("Numpad Component", () => {
  it("should render digits 0 to 9, clear, backspace and confirm buttons", () => {
    render(<Numpad isPreview={true} />);

    // Check all digits
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeDefined();
    }

    // Check clear and backspace buttons
    expect(screen.getByTitle("Clear all")).toBeDefined();
    expect(screen.getByTitle("Backspace")).toBeDefined();
    expect(screen.getByText("Confirm")).toBeDefined();
  });

  it("should trigger callbacks when buttons are clicked or focused", () => {
    const digitSpy = vi.fn();
    const backspaceSpy = vi.fn();
    const clearSpy = vi.fn();
    const confirmSpy = vi.fn();

    render(
      <Numpad
        isPreview={true}
        onDigitPress={digitSpy}
        onBackspacePress={backspaceSpy}
        onClearPress={clearSpy}
        onConfirmPress={confirmSpy}
      />
    );

    const digit4Btn = screen.getByText("4");
    fireEvent.focus(digit4Btn);
    fireEvent.click(digit4Btn);
    expect(digitSpy).toHaveBeenCalledWith(4);

    const backspaceBtn = screen.getByTitle("Backspace");
    fireEvent.focus(backspaceBtn);
    fireEvent.click(backspaceBtn);
    expect(backspaceSpy).toHaveBeenCalledTimes(1);

    const clearBtn = screen.getByTitle("Clear all");
    fireEvent.focus(clearBtn);
    fireEvent.click(clearBtn);
    expect(clearSpy).toHaveBeenCalledTimes(1);

    const confirmBtn = screen.getByText("Confirm");
    fireEvent.focus(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});
