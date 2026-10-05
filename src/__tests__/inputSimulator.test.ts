import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  dispatchKeyEvent,
  sendDigit,
  sendBackspace,
  sendClear,
  sendConfirm,
  getFamilyViewModalContainer,
  isDeckyUIElement,
} from "../services/inputSimulator";

describe("Input Simulator Service", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should correctly identify Decky UI elements", () => {
    const deckyRoot = document.createElement("div");
    deckyRoot.id = "decky-root";
    const child = document.createElement("div");
    deckyRoot.appendChild(child);
    document.body.appendChild(deckyRoot);

    expect(isDeckyUIElement(child)).toBe(true);

    const regularModal = document.createElement("div");
    regularModal.className = "Dialog_Content";
    document.body.appendChild(regularModal);
    expect(isDeckyUIElement(regularModal)).toBe(false);
  });

  it("should dispatch keydown, keypress, and keyup events", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const keydownSpy = vi.fn();
    const keypressSpy = vi.fn();
    const keyupSpy = vi.fn();

    div.addEventListener("keydown", keydownSpy);
    div.addEventListener("keypress", keypressSpy);
    div.addEventListener("keyup", keyupSpy);

    dispatchKeyEvent(div, "5", "Digit5", 53);

    expect(keydownSpy).toHaveBeenCalledTimes(1);
    expect(keypressSpy).toHaveBeenCalledTimes(1);
    expect(keyupSpy).toHaveBeenCalledTimes(1);

    const eventObj = keydownSpy.mock.calls[0][0] as KeyboardEvent;
    expect(eventObj.key).toBe("5");
    expect(eventObj.code).toBe("Digit5");
    expect(eventObj.keyCode).toBe(53);
  });

  it("should detect family view modal container while ignoring Decky UI", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <div class="DialogSubtitle">Enter your PIN below to exit Family View.</div>
    `;
    document.body.appendChild(modal);

    const found = getFamilyViewModalContainer();
    expect(found).not.toBeNull();
    expect(found?.textContent).toContain("Family View");
  });

  it("should fill 4 input boxes sequentially when sendDigit is called", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <div class="InputsRow">
        <input type="password" id="pin0" value="" />
        <input type="password" id="pin1" value="" />
        <input type="password" id="pin2" value="" />
        <input type="password" id="pin3" value="" />
      </div>
      <button class="ConfirmBtn">Confirm</button>
    `;
    document.body.appendChild(modal);

    const inputs = modal.querySelectorAll<HTMLInputElement>("input");

    sendDigit(1, modal);
    expect(inputs[0].value).toBe("1");

    sendDigit(2, modal);
    expect(inputs[1].value).toBe("2");

    sendDigit(3, modal);
    expect(inputs[2].value).toBe("3");

    sendDigit(4, modal);
    expect(inputs[3].value).toBe("4");

    // Test backspace
    sendBackspace(modal);
    expect(inputs[3].value).toBe("");

    // Test clear
    sendClear(modal);
    expect(inputs[0].value).toBe("");
    expect(inputs[1].value).toBe("");
    expect(inputs[2].value).toBe("");
    expect(inputs[3].value).toBe("");
  });

  it("should handle single text input correctly", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <input type="password" id="singlePin" value="" />
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector<HTMLInputElement>("input")!;

    sendDigit(7, modal);
    expect(input.value).toBe("7");

    sendDigit(8, modal);
    expect(input.value).toBe("78");

    sendBackspace(modal);
    expect(input.value).toBe("7");
  });

  it("should trigger confirm button click on sendConfirm", () => {
    const modal = document.createElement("div");
    modal.className = "Dialog_Content";
    modal.innerHTML = `
      <div class="DialogTitle">Family View</div>
      <button id="confirm">Confirm</button>
    `;
    document.body.appendChild(modal);

    const btn = modal.querySelector<HTMLButtonElement>("#confirm")!;
    const clickSpy = vi.fn();
    btn.addEventListener("click", clickSpy);

    sendConfirm(modal);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
