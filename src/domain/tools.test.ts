import { describe, expect, it } from "vitest";
import { advanceActiveTool, createActiveTool, getToolBrush } from "./tools";
import type { Rect, ToolKind } from "./types";

const canvas: Rect = { left: 100, top: 50, width: 400, height: 300 };

describe("getToolBrush", () => {
  it("supports only black pen ink and eraser pixels", () => {
    expect(getToolBrush("black-pen")).toMatchObject({
      compositeOperation: "source-over",
      strokeStyle: "#101827",
      lineWidth: 6,
    });
    expect(getToolBrush("eraser")).toMatchObject({
      compositeOperation: "destination-out",
      lineWidth: 34,
    });

    expect(() => getToolBrush("red-pencil" as unknown as ToolKind)).toThrow("Unsupported tool");
  });
});

describe("advanceActiveTool", () => {
  it("creates a canvas-local pen segment while the tool is held over the canvas", () => {
    const activeTool = createActiveTool("black-pen");

    const first = advanceActiveTool(activeTool, { x: 160, y: 120 }, canvas);
    const second = advanceActiveTool(first.activeTool, { x: 180, y: 150 }, canvas);

    expect(first.segment).toMatchObject({
      kind: "black-pen",
      from: { x: 60, y: 70 },
      to: { x: 60, y: 70 },
    });
    expect(second.segment).toMatchObject({
      kind: "black-pen",
      from: { x: 60, y: 70 },
      to: { x: 80, y: 100 },
    });
  });

  it("creates a world-space segment when the visible viewport is panned", () => {
    const activeTool = createActiveTool("black-pen");

    const result = advanceActiveTool(activeTool, { x: 160, y: 120 }, canvas, { x: 1000, y: 700 });

    expect(result.segment).toMatchObject({
      kind: "black-pen",
      from: { x: 1060, y: 770 },
      to: { x: 1060, y: 770 },
    });
  });

  it("creates a world-space segment when the visible viewport is zoomed", () => {
    const activeTool = createActiveTool("black-pen");

    const result = advanceActiveTool(activeTool, { x: 180, y: 150 }, canvas, { x: 1000, y: 700 }, 2);

    expect(result.segment).toMatchObject({
      kind: "black-pen",
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
