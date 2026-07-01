import { describe, expect, it } from "vitest";
import { advanceActiveTool, createActiveTool, getToolBrush } from "./tools";
import type { Rect } from "./types";

const canvas: Rect = { left: 100, top: 50, width: 400, height: 300 };

describe("getToolBrush", () => {
  it("uses source-over ink for each colored pencil and destination-out pixels for the eraser", () => {
    expect(getToolBrush("red-pencil")).toMatchObject({
      compositeOperation: "source-over",
      strokeStyle: "#ef4444",
      lineWidth: 6,
    });
    expect(getToolBrush("green-pencil")).toMatchObject({
      compositeOperation: "source-over",
      strokeStyle: "#22c55e",
      lineWidth: 6,
    });
    expect(getToolBrush("blue-pencil")).toMatchObject({
      compositeOperation: "source-over",
      strokeStyle: "#2563eb",
      lineWidth: 6,
    });
    expect(getToolBrush("black-pencil")).toMatchObject({
      compositeOperation: "source-over",
      strokeStyle: "#101827",
      lineWidth: 6,
    });

    expect(getToolBrush("eraser")).toMatchObject({
      compositeOperation: "destination-out",
      lineWidth: 34,
    });
  });
});

describe("advanceActiveTool", () => {
  it("creates a canvas-local pencil segment while the tool is held over the canvas", () => {
    const activeTool = createActiveTool("blue-pencil");

    const first = advanceActiveTool(activeTool, { x: 160, y: 120 }, canvas);
    const second = advanceActiveTool(first.activeTool, { x: 180, y: 150 }, canvas);

    expect(first.segment).toMatchObject({
      kind: "blue-pencil",
      from: { x: 60, y: 70 },
      to: { x: 60, y: 70 },
    });
    expect(second.segment).toMatchObject({
      kind: "blue-pencil",
      from: { x: 60, y: 70 },
      to: { x: 80, y: 100 },
    });
  });

  it("creates a world-space segment when the visible viewport is panned", () => {
    const activeTool = createActiveTool("red-pencil");

    const result = advanceActiveTool(activeTool, { x: 160, y: 120 }, canvas, { x: 1000, y: 700 });

    expect(result.segment).toMatchObject({
      kind: "red-pencil",
      from: { x: 1060, y: 770 },
      to: { x: 1060, y: 770 },
    });
  });

  it("creates a world-space segment when the visible viewport is zoomed", () => {
    const activeTool = createActiveTool("green-pencil");

    const result = advanceActiveTool(activeTool, { x: 180, y: 150 }, canvas, { x: 1000, y: 700 }, 2);

    expect(result.segment).toMatchObject({
      kind: "green-pencil",
      from: { x: 1040, y: 750 },
      to: { x: 1040, y: 750 },
    });
  });

  it("clears the previous point outside the canvas so re-entry does not draw a connecting line", () => {
    const activeTool = createActiveTool("eraser");

    const first = advanceActiveTool(activeTool, { x: 160, y: 120 }, canvas);
    const outside = advanceActiveTool(first.activeTool, { x: 80, y: 120 }, canvas);
    const reentered = advanceActiveTool(outside.activeTool, { x: 190, y: 140 }, canvas);

    expect(outside.segment).toBeNull();
    expect(reentered.segment).toMatchObject({
      kind: "eraser",
      from: { x: 90, y: 90 },
      to: { x: 90, y: 90 },
    });
  });
});
