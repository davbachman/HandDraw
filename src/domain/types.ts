export type ToolKind = "black-pen" | "eraser";

export interface PointerState {
  x: number;
  y: number;
  tracked: boolean;
  pinching: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}
