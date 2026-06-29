import { describe, expect, it } from "vitest";
import { shouldHandlePointerFallback, shouldTrackPointerFallback } from "./pointerFallback";

describe("shouldHandlePointerFallback", () => {
  it("does not treat explicitly ignored controls as fallback grab targets", () => {
    const buttonTarget = {
      closest: (selector: string) => (selector.includes("[data-pointer-fallback='ignore']") ? {} : null),
    };

    expect(shouldHandlePointerFallback(buttonTarget)).toBe(false);
  });

  it("allows palette buttons to participate in mouse fallback dragging", () => {
    const paletteButtonTarget = {
      closest: (selector: string) => (selector.includes("button") ? {} : null),
    };

    expect(shouldHandlePointerFallback(paletteButtonTarget)).toBe(true);
  });

  it("allows fallback handling on non-control app surfaces", () => {
    const canvasTarget = {
      closest: () => null,
    };

    expect(shouldHandlePointerFallback(canvasTarget)).toBe(true);
  });
});

describe("shouldTrackPointerFallback", () => {
  it("keeps the visible pointer following ignored controls", () => {
    const buttonTarget = {
      closest: (selector: string) => (selector.includes("[data-pointer-fallback='ignore']") ? {} : null),
    };

    expect(shouldTrackPointerFallback(buttonTarget)).toBe(true);
  });
});
