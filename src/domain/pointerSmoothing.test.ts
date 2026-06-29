import { describe, expect, it } from "vitest";
import { defaultSmoothingOptions, drawingSmoothingOptions, smoothPointer } from "./pointerSmoothing";

describe("smoothPointer", () => {
  it("uses the raw point when there is no previous tracked point", () => {
    expect(smoothPointer(null, { x: 300, y: 180 })).toEqual({ x: 300, y: 180 });
  });

  it("eases small frame-to-frame movement to reduce hand landmark jitter", () => {
    expect(smoothPointer({ x: 300, y: 180 }, { x: 320, y: 160 }, { alpha: 0.25, snapDistance: 160 })).toEqual({
      x: 305,
      y: 175,
    });
  });

  it("snaps to large hand movement so smoothing does not feel sticky", () => {
    expect(smoothPointer({ x: 100, y: 100 }, { x: 420, y: 300 }, { alpha: 0.25, snapDistance: 160 })).toEqual({
      x: 420,
      y: 300,
    });
  });

  it("uses less smoothing while drawing or erasing so active strokes feel responsive", () => {
    const previous = { x: 100, y: 100 };
    const raw = { x: 140, y: 100 };

    expect(smoothPointer(previous, raw, drawingSmoothingOptions).x).toBeGreaterThan(
      smoothPointer(previous, raw, defaultSmoothingOptions).x,
    );
    expect(drawingSmoothingOptions.alpha).toBe(0.42);
  });
});
