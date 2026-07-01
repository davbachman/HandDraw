import { describe, expect, it } from "vitest";
import { chooseTool, releaseTool, selectTouchedTool, startSelectedTool } from "./toolSelection";

describe("tool selection", () => {
  it("selects a sidebar tool without starting a drawing session", () => {
    expect(chooseTool({ selectedTool: null, activeTool: null }, "black-pen")).toEqual({
      selectedTool: "black-pen",
      activeTool: null,
    });
  });

  it("starts using the selected tool without clearing the selection", () => {
    const state = startSelectedTool({ selectedTool: "eraser", activeTool: null });

    expect(state.selectedTool).toBe("eraser");
    expect(state.activeTool).toMatchObject({ kind: "eraser", lastCanvasPoint: null });
  });

  it("releases only the active tool and keeps the sidebar tool highlighted", () => {
    const drawing = startSelectedTool({ selectedTool: "black-pen", activeTool: null });

    expect(releaseTool(drawing)).toEqual({
      selectedTool: "black-pen",
      activeTool: null,
    });
  });

  it("does not start drawing when no tool is selected", () => {
    expect(startSelectedTool({ selectedTool: null, activeTool: null })).toEqual({
      selectedTool: null,
      activeTool: null,
    });
  });

  it("selects a touched sidebar tool without requiring a pinch", () => {
    expect(selectTouchedTool({ selectedTool: null, activeTool: null }, "black-pen")).toEqual({
      selectedTool: "black-pen",
      activeTool: null,
    });
  });

  it("keeps the current tool state when the pointer is not touching a tool", () => {
    const drawing = startSelectedTool({ selectedTool: "black-pen", activeTool: null });

    expect(selectTouchedTool(drawing, null)).toBe(drawing);
  });
});
