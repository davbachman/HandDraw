import { createActiveTool, type ActiveTool } from "./tools";
import type { ToolKind } from "./types";

export interface ToolSelectionState {
  selectedTool: ToolKind | null;
  activeTool: ActiveTool | null;
}

export const chooseTool = (state: ToolSelectionState, tool: ToolKind): ToolSelectionState => ({
  ...state,
  selectedTool: tool,
  activeTool: null,
});

export const selectTouchedTool = (state: ToolSelectionState, tool: ToolKind | null): ToolSelectionState => {
  if (!tool) {
    return state;
  }

  return chooseTool(state, tool);
};

export const startSelectedTool = (state: ToolSelectionState): ToolSelectionState => {
  if (!state.selectedTool) {
    return state;
  }

  return {
    ...state,
    activeTool: createActiveTool(state.selectedTool),
  };
};

export const releaseTool = (state: ToolSelectionState): ToolSelectionState => ({
  ...state,
  activeTool: null,
});
