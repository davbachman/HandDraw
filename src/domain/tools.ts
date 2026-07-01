import { pointInRect } from "./geometry";
import type { Point, Rect, ToolKind } from "./types";
import { viewportPointToWorld } from "./viewport";

export interface ActiveTool {
  kind: ToolKind;
  lastCanvasPoint: Point | null;
}

export interface ToolBrush {
  compositeOperation: GlobalCompositeOperation;
  lineWidth: number;
  strokeStyle: string;
}

export interface ToolStrokeSegment extends ToolBrush {
  kind: ToolKind;
  from: Point;
  to: Point;
}

export interface ToolAdvanceResult {
  activeTool: ActiveTool;
  segment: ToolStrokeSegment | null;
}

export const createActiveTool = (kind: ToolKind): ActiveTool => ({
  kind,
  lastCanvasPoint: null,
});

const pencilColors: Record<Exclude<ToolKind, "eraser">, string> = {
  "red-pencil": "#ef4444",
  "green-pencil": "#22c55e",
  "blue-pencil": "#2563eb",
  "black-pencil": "#101827",
};

export const getToolBrush = (kind: ToolKind): ToolBrush => {
  if (kind === "eraser") {
    return {
      compositeOperation: "destination-out",
      lineWidth: 34,
      strokeStyle: "rgba(0, 0, 0, 1)",
    };
  }

  return {
    compositeOperation: "source-over",
    lineWidth: 6,
    strokeStyle: pencilColors[kind],
  };
};

export const advanceActiveTool = (
  activeTool: ActiveTool,
  viewportPoint: Point,
  canvasRect: Rect,
  viewportOffset: Point = { x: 0, y: 0 },
  viewportZoom = 1,
): ToolAdvanceResult => {
  if (!pointInRect(viewportPoint, canvasRect)) {
    return {
      activeTool: { ...activeTool, lastCanvasPoint: null },
      segment: null,
    };
  }

  const canvasPoint = viewportPointToWorld(viewportPoint, canvasRect, viewportOffset, viewportZoom);
  const from = activeTool.lastCanvasPoint ?? canvasPoint;

  return {
    activeTool: { ...activeTool, lastCanvasPoint: canvasPoint },
    segment: {
      kind: activeTool.kind,
      from,
      to: canvasPoint,
      ...getToolBrush(activeTool.kind),
    },
  };
};
