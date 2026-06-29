import { describe, expect, it } from "vitest";
import { centerViewportOffset, expandWorldSizeToCoverViewport, panViewportOffset, viewportPointToWorld, zoomViewportAtPoint } from "./viewport";

describe("viewportPointToWorld", () => {
  it("maps a visible pointer position into the panned drawing world", () => {
    expect(
      viewportPointToWorld(
        { x: 320, y: 180 },
        { left: 200, top: 80, width: 500, height: 300 },
        { x: 900, y: 600 },
      ),
    ).toEqual({ x: 1020, y: 700 });
  });

  it("maps a visible pointer position through the current viewport zoom", () => {
    expect(
      viewportPointToWorld(
        { x: 320, y: 180 },
        { left: 200, top: 80, width: 500, height: 300 },
        { x: 900, y: 600 },
        2,
      ),
    ).toEqual({ x: 960, y: 650 });
  });
});

describe("panViewportOffset", () => {
  it("moves the viewport opposite the hand delta so grabbed content follows the hand", () => {
    expect(
      panViewportOffset(
        { x: 900, y: 600 },
        { x: 40, y: -30 },
        { width: 500, height: 300 },
        { width: 2000, height: 1400 },
      ),
    ).toEqual({ x: 860, y: 630 });
  });

  it("clamps panning to the drawing world's edges", () => {
    expect(
      panViewportOffset(
        { x: 10, y: 1080 },
        { x: 80, y: -80 },
        { width: 500, height: 300 },
        { width: 2000, height: 1400 },
      ),
    ).toEqual({ x: 0, y: 1100 });
  });

  it("scales panning by zoom so grabbed content follows the hand", () => {
    expect(
      panViewportOffset(
        { x: 900, y: 600 },
        { x: 40, y: -30 },
        { width: 500, height: 300 },
        { width: 2000, height: 1400 },
        2,
      ),
    ).toEqual({ x: 880, y: 615 });
  });
});

describe("centerViewportOffset", () => {
  it("starts the visible viewport in the center of the larger drawing world", () => {
    expect(centerViewportOffset({ width: 2000, height: 1400 }, { width: 500, height: 300 })).toEqual({
      x: 750,
      y: 550,
    });
  });
});

describe("expandWorldSizeToCoverViewport", () => {
  it("expands the drawing world when zooming out exposes coordinates beyond the current world", () => {
    expect(
      expandWorldSizeToCoverViewport(
        { width: 3200, height: 2200 },
        { x: 0, y: 0 },
        { width: 1900, height: 1000 },
        0.5,
      ),
    ).toEqual({
      width: 3800,
      height: 2200,
    });
  });

  it("keeps the current drawing world when the viewport is already inside it", () => {
    expect(
      expandWorldSizeToCoverViewport(
        { width: 3200, height: 2200 },
        { x: 600, y: 400 },
        { width: 900, height: 600 },
        1,
      ),
    ).toEqual({
      width: 3200,
      height: 2200,
    });
  });
});

describe("zoomViewportAtPoint", () => {
  it("keeps the focal world point under the same viewport point", () => {
    const canvas = { left: 200, top: 80, width: 500, height: 300 };
    const focalPoint = { x: 320, y: 180 };
    const before = viewportPointToWorld(focalPoint, canvas, { x: 900, y: 600 }, 1);
    const zoomed = zoomViewportAtPoint(
      { offset: { x: 900, y: 600 }, zoom: 1 },
      2,
      focalPoint,
      canvas,
      { width: 2000, height: 1400 },
      { min: 0.5, max: 3 },
    );
    const after = viewportPointToWorld(focalPoint, canvas, zoomed.offset, zoomed.zoom);

    expect(after).toEqual(before);
    expect(zoomed.zoom).toBe(2);
  });

  it("clamps zoom and offset to the visible world", () => {
    expect(
      zoomViewportAtPoint(
        { offset: { x: 0, y: 0 }, zoom: 1 },
        0.1,
        { x: 700, y: 380 },
        { left: 200, top: 80, width: 500, height: 300 },
        { width: 2000, height: 1400 },
        { min: 0.5, max: 3 },
      ),
    ).toEqual({
      offset: { x: 0, y: 0 },
      zoom: 0.5,
    });
  });
});
