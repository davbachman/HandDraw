import "./styles.css";
import { HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { shouldHandlePointerFallback, shouldTrackPointerFallback } from "./dom/pointerFallback";
import { mapLandmarkToViewport, pointInRect } from "./domain/geometry";
import { calculateFingerExtensionRatio, calculatePinchRatio, nextFistState, nextPinchState } from "./domain/gesture";
import { cameraInputOverscanRatio, viewportZoomRange, zoomDeadband } from "./domain/interactionSettings";
import { defaultSmoothingOptions, drawingSmoothingOptions, smoothPointer } from "./domain/pointerSmoothing";
import { releaseTool, selectTouchedTool, startSelectedTool } from "./domain/toolSelection";
import { advanceActiveTool, type ActiveTool, type ToolStrokeSegment } from "./domain/tools";
import { areHandsEdgeOnForZoom, beginTwoHandZoom, calculatePointDistance, getMidpoint, getTwoHandZoom, type TwoHandZoomState } from "./domain/twoHandZoom";
import type { Point, PointerState, Rect, Size, ToolKind } from "./domain/types";
import { centerViewportOffset, clampViewportOffset, expandWorldSizeToCoverViewport, panViewportOffset, zoomViewportAtPoint } from "./domain/viewport";
import { HandTracker, requestCameraStream } from "./tracking";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element.");
}

const app = appRoot;

const paletteItems: Array<{ kind: ToolKind; label: string }> = [
  { kind: "red-pencil", label: "Red" },
  { kind: "green-pencil", label: "Green" },
  { kind: "blue-pencil", label: "Blue" },
  { kind: "black-pencil", label: "Black" },
  { kind: "eraser", label: "Eraser" },
];

const trackingGraceMs = 650;
let worldSize: Size = { width: 3200, height: 2200 };

let tracker: HandTracker | null = null;
let cameraStream: MediaStream | null = null;
let selectedTool: ToolKind | null = null;
let activeTool: ActiveTool | null = null;
let pointer: PointerState = { x: window.innerWidth / 2, y: window.innerHeight / 2, tracked: false, pinching: false };
let wasPinching = false;
let wasFist = false;
let animationFrame = 0;
let lostTrackingAt: number | null = null;
let statusMessage = "Use the mouse fallback now, or start the camera when ready. Closed fist over the canvas pans.";
let cameraStatus: "idle" | "loading" | "active" | "error" = "idle";
let lastPinchRatio: number | null = null;
let lastFingerExtensionRatio: number | null = null;
let hasCanvasMarks = false;
let smoothedHandPoint: Point | null = null;
let viewportOffset: Point = { x: 0, y: 0 };
let viewportZoom = 1;
let viewportInitialized = false;
let panState: { lastPoint: Point } | null = null;
let twoHandZoomState: TwoHandZoomState | null = null;
let worldScale = window.devicePixelRatio || 1;
const worldCanvas = document.createElement("canvas");

app.innerHTML = `
  <main class="app" aria-label="Hand-control drawing canvas">
    <aside class="sidebar">
      <div class="brand">
        <h1 class="brand__title">Hand Draw</h1>
        <span class="brand__meta">Pinch a colored pencil or eraser, then pinch the canvas to use it. Close your fist over the canvas to pan.</span>
      </div>
      <div class="palette" aria-label="Tool palette">
        ${paletteItems
          .map(
            (item) => `
              <button class="palette-item" type="button" data-tool="${item.kind}" aria-label="${item.label}" aria-pressed="false">
                ${toolIcon(item.kind)}
                <span class="palette-label">${item.label}</span>
              </button>
            `,
          )
          .join("")}
      </div>
    </aside>
    <section class="workspace" aria-label="Drawing canvas">
      <div class="canvas" data-canvas>
        <canvas class="drawing-surface" data-drawing-canvas></canvas>
        <span class="canvas-empty" data-empty-label>Select a pencil or eraser, then pinch the canvas to draw or erase.</span>
      </div>
    </section>
    <footer class="footer" aria-label="Camera diagnostics">
      <div class="camera-preview">
        <video data-video playsinline muted></video>
        <canvas data-debug-canvas></canvas>
      </div>
      <div class="status">
        <div class="status-line">
          <span class="pill" data-camera-pill>Camera idle</span>
          <span class="pill" data-tracking-pill>No hand</span>
          <span class="pill" data-tool-pill>Open</span>
        </div>
        <div class="message" data-message>${statusMessage}</div>
      </div>
      <div class="controls">
        <button class="camera-button" type="button" data-camera-button data-pointer-fallback="ignore">Start Camera</button>
        <p class="hint">Mouse fallback: click a tool, then press-drag on the canvas.</p>
      </div>
    </footer>
    <div class="tool-preview" data-tool-preview></div>
    <div class="cursor is-untracked" data-cursor></div>
  </main>
`;

const requiredElement = <ElementType extends Element>(selector: string): ElementType => {
  const element = app.querySelector<ElementType>(selector);
  if (!element) {
    throw new Error(`The app template is missing required element: ${selector}`);
  }

  return element;
};

const root = requiredElement<HTMLElement>(".app");
const video = requiredElement<HTMLVideoElement>("[data-video]");
const debugCanvas = requiredElement<HTMLCanvasElement>("[data-debug-canvas]");
const canvas = requiredElement<HTMLElement>("[data-canvas]");
const drawingCanvas = requiredElement<HTMLCanvasElement>("[data-drawing-canvas]");
const cursor = requiredElement<HTMLElement>("[data-cursor]");
const toolPreview = requiredElement<HTMLElement>("[data-tool-preview]");
const cameraButton = requiredElement<HTMLButtonElement>("[data-camera-button]");
const cameraPill = requiredElement<HTMLElement>("[data-camera-pill]");
const trackingPill = requiredElement<HTMLElement>("[data-tracking-pill]");
const toolPill = requiredElement<HTMLElement>("[data-tool-pill]");
const message = requiredElement<HTMLElement>("[data-message]");
const emptyLabel = requiredElement<HTMLElement>("[data-empty-label]");

cameraButton.addEventListener("click", () => {
  void startCamera();
});

root.addEventListener("pointermove", (event) => {
  if (pointer.tracked || !shouldTrackPointerFallback(event.target)) {
    return;
  }

  smoothedHandPoint = null;
  pointer = { ...pointer, x: event.clientX, y: event.clientY };
  if (selectToolUnderPointer()) {
    render();
    return;
  }

  if (shouldHandlePointerFallback(event.target)) {
    drawWithActiveTool();
  }
  render();
});

root.addEventListener("pointerdown", (event) => {
  if (pointer.tracked || !shouldHandlePointerFallback(event.target)) {
    return;
  }

  root.setPointerCapture(event.pointerId);
  smoothedHandPoint = null;
  pointer = { x: event.clientX, y: event.clientY, tracked: false, pinching: true };
  handleHoldStart();
  render();
});

root.addEventListener("pointerup", (event) => {
  if (pointer.tracked || !shouldHandlePointerFallback(event.target)) {
    return;
  }

  root.releasePointerCapture(event.pointerId);
  smoothedHandPoint = null;
  pointer = { x: event.clientX, y: event.clientY, tracked: false, pinching: false };
  releaseActiveTool();
  render();
});

window.addEventListener("resize", () => {
  resizeDrawingCanvas();
  render();
});

resizeWorldCanvas();
resizeDrawingCanvas();
render();

async function startCamera(): Promise<void> {
  if (cameraStatus === "loading" || cameraStatus === "active") {
    return;
  }

  cameraStatus = "loading";
  statusMessage = "Requesting camera permission and loading the hand model...";
  cameraButton.disabled = true;
  cameraButton.textContent = "Starting...";
  renderStatus();

  try {
    tracker = new HandTracker();
    await tracker.initialize();
    cameraStream = await requestCameraStream();
    video.srcObject = cameraStream;
    await video.play();

    cameraStatus = "active";
    statusMessage = "Camera active. Pinch a colored pencil or eraser, then pinch the canvas to use it.";
    cameraButton.textContent = "Camera Active";
    renderStatus();
    animationFrame = requestAnimationFrame(processVideoFrame);
  } catch (error) {
    cameraStatus = "error";
    statusMessage = error instanceof Error ? error.message : "Camera startup failed.";
    cameraButton.disabled = false;
    cameraButton.textContent = "Retry Camera";
    tracker = null;
    stopCameraStream();
    renderStatus();
  }
}

function processVideoFrame(now: number): void {
  if (!tracker || cameraStatus !== "active") {
    return;
  }

  const frame = tracker.detect(video, now);
  if (frame) {
    drawDebugLandmarks(frame.hands);

    if (frame.hands.length > 0) {
      updateFromHands(frame.hands);
    } else {
      updateTrackingLost(now);
    }
  }

  render();
  animationFrame = requestAnimationFrame(processVideoFrame);
}

function updateFromHands(hands: NormalizedLandmark[][]): void {
  if (hands.length >= 2) {
    const firstPoint = mapHandPointerToViewport(hands[0]);
    const secondPoint = mapHandPointerToViewport(hands[1]);

    if (pointInRect(firstPoint, getCanvasRect()) && pointInRect(secondPoint, getCanvasRect()) && areHandsEdgeOnForZoom(hands[0], hands[1])) {
      updateFromTwoHands(firstPoint, secondPoint);
      return;
    }
  }

  stopTwoHandZoom();
  updateFromLandmarks(hands[0]);
}

function updateFromLandmarks(landmarks: NormalizedLandmark[]): void {
  const rawPoint = mapHandPointerToViewport(landmarks);
  const point = smoothPointer(smoothedHandPoint, rawPoint, activeTool ? drawingSmoothingOptions : defaultSmoothingOptions);
  const pinchRatio = calculatePinchRatio(landmarks);
  const fingerExtensionRatio = calculateFingerExtensionRatio(landmarks);
  const fisting = nextFistState(wasFist, fingerExtensionRatio);
  const pinching = fisting ? false : nextPinchState(wasPinching, pinchRatio);

  smoothedHandPoint = point;
  lastPinchRatio = pinchRatio;
  lastFingerExtensionRatio = fingerExtensionRatio;
  lostTrackingAt = null;
  pointer = { x: point.x, y: point.y, tracked: true, pinching };

  if (selectToolUnderPointer()) {
    wasPinching = false;
    wasFist = false;
    return;
  }

  if (fisting) {
    if (!wasFist) {
      startCanvasPan(point);
    } else {
      panCanvas(point);
    }

    wasFist = true;
    wasPinching = false;
    return;
  }

  if (wasFist) {
    stopCanvasPan();
  }

  if (!wasPinching && pinching) {
    handleHoldStart();
  }

  if (pinching) {
    drawWithActiveTool();
  }

  if (wasPinching && !pinching) {
    releaseActiveTool();
  }

  wasPinching = pinching;
  wasFist = false;
}

function updateFromTwoHands(firstPoint: Point, secondPoint: Point): void {
  const midpoint = getMidpoint(firstPoint, secondPoint);
  const distance = calculatePointDistance(firstPoint, secondPoint);

  if (activeTool) {
    releaseActiveTool("Zooming canvas.");
  }

  if (panState) {
    stopCanvasPan("Zooming canvas.");
  }

  twoHandZoomState ??= beginTwoHandZoom(distance, viewportZoom);
  const nextZoom = getTwoHandZoom(twoHandZoomState, distance);
  if (Math.abs(nextZoom - viewportZoom) > zoomDeadband) {
    const nextViewport = zoomViewportAtPoint(
      { offset: viewportOffset, zoom: viewportZoom },
      nextZoom,
      midpoint,
      getCanvasRect(),
      worldSize,
      viewportZoomRange,
    );
    viewportOffset = nextViewport.offset;
    viewportZoom = nextViewport.zoom;
    renderWorldViewport();
  }

  pointer = { x: midpoint.x, y: midpoint.y, tracked: true, pinching: false };
  smoothedHandPoint = null;
  lastPinchRatio = null;
  lastFingerExtensionRatio = null;
  lostTrackingAt = null;
  wasPinching = false;
  wasFist = false;
  statusMessage = `Two-hand zoom active (${Math.round(viewportZoom * 100)}%).`;
}

function updateTrackingLost(now: number): void {
  pointer = { ...pointer, tracked: false, pinching: false };
  smoothedHandPoint = null;
  lastPinchRatio = null;
  lastFingerExtensionRatio = null;
  wasFist = false;

  if (panState) {
    stopCanvasPan("Tracking paused; canvas pan stopped.");
  }

  stopTwoHandZoom("Tracking paused; zoom stopped.");

  if (!activeTool) {
    wasPinching = false;
    lostTrackingAt = null;
    return;
  }

  lostTrackingAt ??= now;
  if (now - lostTrackingAt < trackingGraceMs) {
    return;
  }

  releaseActiveTool("Tracking paused; selected tool is ready when tracking returns.");
  wasPinching = false;
  lostTrackingAt = null;
}

function handleHoldStart(): void {
  const point = { x: pointer.x, y: pointer.y };
  const paletteTool = getPaletteToolAt(point);

  if (paletteTool) {
    selectToolUnderPointer();
    return;
  }

  if (!pointInRect(point, getCanvasRect())) {
    statusMessage = selectedTool ? `${toolLabel(selectedTool)} selected. Pinch inside the canvas to use it.` : "Pinch a pencil or eraser first.";
    return;
  }

  if (!selectedTool) {
    statusMessage = "Pinch a pencil or eraser first.";
    return;
  }

  const state = startSelectedTool({ selectedTool, activeTool });
  selectedTool = state.selectedTool;
  activeTool = state.activeTool;
  drawWithActiveTool();
}

function selectToolUnderPointer(): boolean {
  const paletteTool = getPaletteToolAt({ x: pointer.x, y: pointer.y });
  if (!paletteTool) {
    return false;
  }

  const state = selectTouchedTool({ selectedTool, activeTool }, paletteTool);
  selectedTool = state.selectedTool;
  activeTool = state.activeTool;
  statusMessage = `${toolLabel(paletteTool)} selected. Pinch the canvas to ${isPencilTool(paletteTool) ? "draw" : "erase"}.`;
  return true;
}

function drawWithActiveTool(): void {
  if (!activeTool) {
    return;
  }

  ensureWorldCoversViewport();
  const result = advanceActiveTool(activeTool, { x: pointer.x, y: pointer.y }, getCanvasRect(), viewportOffset, viewportZoom);
  activeTool = result.activeTool;

  if (!result.segment) {
    return;
  }

  drawSegment(result.segment);
  renderWorldViewport();
  hasCanvasMarks = true;
  statusMessage = isPencilTool(result.segment.kind) ? `Drawing with ${toolLabel(result.segment.kind)}.` : "Erasing pixels.";
}

function releaseActiveTool(nextMessage?: string): void {
  if (!activeTool) {
    return;
  }

  const releasedTool = activeTool.kind;
  const state = releaseTool({ selectedTool, activeTool });
  selectedTool = state.selectedTool;
  activeTool = state.activeTool;
  lostTrackingAt = null;
  statusMessage = nextMessage ?? `${toolLabel(releasedTool)} stopped. ${toolLabel(releasedTool)} remains selected.`;
}

function startCanvasPan(point: Point): void {
  if (activeTool) {
    releaseActiveTool("Panning canvas.");
  }

  if (!pointInRect(point, getCanvasRect())) {
    panState = null;
    statusMessage = "Closed fist detected. Move it over the canvas to pan.";
    return;
  }

  panState = { lastPoint: point };
  statusMessage = "Panning canvas.";
}

function panCanvas(point: Point): void {
  if (!panState) {
    if (pointInRect(point, getCanvasRect())) {
      panState = { lastPoint: point };
      statusMessage = "Panning canvas.";
    }
    return;
  }

  const delta = {
    x: point.x - panState.lastPoint.x,
    y: point.y - panState.lastPoint.y,
  };
  viewportOffset = panViewportOffset(viewportOffset, delta, getCanvasSize(), worldSize, viewportZoom);
  panState = { lastPoint: point };
  statusMessage = "Panning canvas.";
  renderWorldViewport();
}

function stopCanvasPan(nextMessage?: string): void {
  if (!panState) {
    return;
  }

  panState = null;
  statusMessage = nextMessage ?? "Canvas pan stopped.";
}

function stopTwoHandZoom(nextMessage?: string): void {
  if (!twoHandZoomState) {
    return;
  }

  twoHandZoomState = null;
  statusMessage = nextMessage ?? `Zoom set to ${Math.round(viewportZoom * 100)}%.`;
}

function drawSegment(segment: ToolStrokeSegment): void {
  const context = worldCanvas.getContext("2d");
  if (!context) {
    return;
  }

  const scale = worldScale;
  context.save();
  context.scale(scale, scale);
  context.globalCompositeOperation = segment.compositeOperation;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = segment.lineWidth;
  context.strokeStyle = segment.strokeStyle;
  context.fillStyle = segment.strokeStyle;

  if (segment.from.x === segment.to.x && segment.from.y === segment.to.y) {
    context.beginPath();
    context.arc(segment.to.x, segment.to.y, segment.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(segment.from.x, segment.from.y);
    context.lineTo(segment.to.x, segment.to.y);
    context.stroke();
  }

  context.restore();
}

function getPaletteToolAt(point: Point): ToolKind | null {
  const items = [...app.querySelectorAll<HTMLElement>("[data-tool]")];
  const hit = items.find((item) => pointInRect(point, domRectToRect(item.getBoundingClientRect())));
  const value = hit?.dataset.tool;
  return value === "red-pencil" || value === "green-pencil" || value === "blue-pencil" || value === "black-pencil" || value === "eraser" ? value : null;
}

function getCanvasRect(): Rect {
  return domRectToRect(canvas.getBoundingClientRect());
}

function getCanvasSize(): Size {
  const rect = drawingCanvas.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function mapHandPointerToViewport(landmarks: NormalizedLandmark[]): Point {
  return mapLandmarkToViewport(
    landmarks[8],
    { width: window.innerWidth, height: window.innerHeight },
    { mirrorX: true, overscanRatio: cameraInputOverscanRatio },
  );
}

function domRectToRect(rect: DOMRect): Rect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function resizeDrawingCanvas(): void {
  const rect = drawingCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));

  resizeWorldCanvas(scale);

  if (drawingCanvas.width !== width || drawingCanvas.height !== height) {
    drawingCanvas.width = width;
    drawingCanvas.height = height;
  }

  const viewportSize = getCanvasSize();
  viewportOffset = viewportInitialized ? clampViewportOffset(viewportOffset, viewportSize, worldSize, viewportZoom) : centerViewportOffset(worldSize, viewportSize, viewportZoom);
  viewportInitialized = true;
  renderWorldViewport();
}

function resizeWorldCanvas(nextScale = window.devicePixelRatio || 1, nextWorldSize = worldSize): void {
  const width = Math.max(1, Math.round(nextWorldSize.width * nextScale));
  const height = Math.max(1, Math.round(nextWorldSize.height * nextScale));

  if (worldCanvas.width === width && worldCanvas.height === height) {
    worldScale = nextScale;
    worldSize = nextWorldSize;
    return;
  }

  const previousScale = worldScale || nextScale;
  const previousLogicalWidth = worldCanvas.width / previousScale;
  const previousLogicalHeight = worldCanvas.height / previousScale;
  const snapshot = document.createElement("canvas");
  snapshot.width = worldCanvas.width;
  snapshot.height = worldCanvas.height;
  snapshot.getContext("2d")?.drawImage(worldCanvas, 0, 0);

  worldCanvas.width = width;
  worldCanvas.height = height;

  if (snapshot.width > 0 && snapshot.height > 0) {
    worldCanvas
      .getContext("2d")
      ?.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, Math.round(previousLogicalWidth * nextScale), Math.round(previousLogicalHeight * nextScale));
  }

  worldScale = nextScale;
  worldSize = nextWorldSize;
}

function ensureWorldCoversViewport(): void {
  const viewportSize = getCanvasSize();
  const nextWorldSize = expandWorldSizeToCoverViewport(worldSize, viewportOffset, viewportSize, viewportZoom);

  if (nextWorldSize.width !== worldSize.width || nextWorldSize.height !== worldSize.height) {
    resizeWorldCanvas(window.devicePixelRatio || 1, nextWorldSize);
    viewportOffset = clampViewportOffset(viewportOffset, viewportSize, worldSize, viewportZoom);
  }
}

function renderWorldViewport(): void {
  const context = drawingCanvas.getContext("2d");
  if (!context) {
    return;
  }

  ensureWorldCoversViewport();
  const rect = drawingCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const sourceWidth = rect.width / viewportZoom;
  const sourceHeight = rect.height / viewportZoom;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  context.drawImage(
    worldCanvas,
    Math.round(viewportOffset.x * worldScale),
    Math.round(viewportOffset.y * worldScale),
    Math.round(sourceWidth * worldScale),
    Math.round(sourceHeight * worldScale),
    0,
    0,
    Math.round(rect.width * scale),
    Math.round(rect.height * scale),
  );

  const gridSize = 32 * viewportZoom;
  canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  canvas.style.backgroundPosition = `${(-viewportOffset.x * viewportZoom) % gridSize}px ${(-viewportOffset.y * viewportZoom) % gridSize}px`;
}

function render(): void {
  renderWorldViewport();
  renderPaletteSelection();
  renderToolPreview();
  renderCursor();
  renderStatus();
  emptyLabel.style.display = hasCanvasMarks ? "none" : "block";
}

function renderPaletteSelection(): void {
  for (const item of app.querySelectorAll<HTMLElement>("[data-tool]")) {
    const isSelected = item.dataset.tool === selectedTool;
    item.classList.toggle("is-selected", isSelected);
    item.setAttribute("aria-pressed", String(isSelected));
  }
}

function renderToolPreview(): void {
  if (!activeTool) {
    toolPreview.innerHTML = "";
    toolPreview.className = "tool-preview";
    return;
  }

  toolPreview.className = `tool-preview tool-preview--${activeTool.kind}`;
  toolPreview.style.left = `${pointer.x}px`;
  toolPreview.style.top = `${pointer.y}px`;
  toolPreview.innerHTML = toolIcon(activeTool.kind);
}

function renderCursor(): void {
  cursor.style.setProperty("--cursor-x", `${pointer.x}px`);
  cursor.style.setProperty("--cursor-y", `${pointer.y}px`);
  cursor.classList.toggle("is-pinching", pointer.pinching || Boolean(activeTool));
  cursor.classList.toggle("is-panning", Boolean(panState || wasFist));
  cursor.classList.toggle("is-untracked", !pointer.tracked);
}

function renderStatus(): void {
  const cameraText =
    cameraStatus === "active" ? "Camera active" : cameraStatus === "loading" ? "Camera loading" : cameraStatus === "error" ? "Camera error" : "Camera idle";
  cameraPill.textContent = cameraText;
  cameraPill.className = `pill ${cameraStatus === "active" ? "pill--ok" : cameraStatus === "error" ? "pill--hot" : cameraStatus === "loading" ? "pill--warn" : ""}`;

  trackingPill.textContent = pointer.tracked ? "Hand tracked" : "No hand";
  trackingPill.className = `pill ${pointer.tracked ? "pill--ok" : ""}`;

  const openText =
    lastPinchRatio === null || lastFingerExtensionRatio === null
      ? "Open"
      : `Open (${lastPinchRatio.toFixed(2)} / ${lastFingerExtensionRatio.toFixed(2)})`;
  const toolText = twoHandZoomState
    ? `Zoom ${Math.round(viewportZoom * 100)}%`
    : panState
      ? "Panning canvas"
      : wasFist
        ? "Fist detected"
        : activeTool
          ? `${toolLabel(activeTool.kind)} active`
          : selectedTool
            ? `${toolLabel(selectedTool)} selected`
            : openText;
  toolPill.textContent = toolText;
  toolPill.className = `pill ${twoHandZoomState ? "pill--warn" : panState || wasFist || activeTool ? "pill--hot" : selectedTool ? "pill--ok" : ""}`;

  message.textContent = statusMessage;
}

function toolLabel(kind: ToolKind): string {
  if (kind === "red-pencil") {
    return "Red pencil";
  }

  if (kind === "green-pencil") {
    return "Green pencil";
  }

  if (kind === "blue-pencil") {
    return "Blue pencil";
  }

  if (kind === "black-pencil") {
    return "Black pencil";
  }

  return "Eraser";
}

function isPencilTool(kind: ToolKind): boolean {
  return kind !== "eraser";
}

function toolIcon(kind: ToolKind): string {
  if (kind === "eraser") {
    return `
      <svg class="tool-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path class="tool-icon__accent" d="M13 35 7 29 25 11c2.4-2.4 6.2-2.4 8.6 0l7.4 7.4c2.4 2.4 2.4 6.2 0 8.6L29 39H17.2A6 6 0 0 1 13 35Z"></path>
        <path class="tool-icon__line" d="m19 23 13 13"></path>
        <path class="tool-icon__line" d="M16 39h25"></path>
      </svg>
    `;
  }

  return `
    <svg class="tool-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path class="tool-icon__accent" d="M9 34 7 41l7-2 25-25-5-5L9 34Z"></path>
      <path class="tool-icon__line" d="m30 13 5 5"></path>
      <path class="tool-icon__line" d="M9 34l5 5"></path>
    </svg>
  `;
}

function drawDebugLandmarks(hands: NormalizedLandmark[][]): void {
  const context = debugCanvas.getContext("2d");
  if (!context) {
    return;
  }

  const width = debugCanvas.clientWidth * window.devicePixelRatio;
  const height = debugCanvas.clientHeight * window.devicePixelRatio;
  if (debugCanvas.width !== width || debugCanvas.height !== height) {
    debugCanvas.width = width;
    debugCanvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  if (hands.length === 0) {
    return;
  }

  context.save();
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  context.lineWidth = 2;
  context.strokeStyle = "rgba(20, 184, 166, 0.85)";
  context.fillStyle = "rgba(255, 255, 255, 0.9)";

  for (const landmarks of hands) {
    for (const connection of HandLandmarker.HAND_CONNECTIONS) {
      const from = landmarks[connection.start];
      const to = landmarks[connection.end];
      context.beginPath();
      context.moveTo(from.x * debugCanvas.clientWidth, from.y * debugCanvas.clientHeight);
      context.lineTo(to.x * debugCanvas.clientWidth, to.y * debugCanvas.clientHeight);
      context.stroke();
    }

    for (const landmark of landmarks) {
      context.beginPath();
      context.arc(landmark.x * debugCanvas.clientWidth, landmark.y * debugCanvas.clientHeight, 2.6, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}

function stopCameraStream(): void {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  smoothedHandPoint = null;
  twoHandZoomState = null;
  video.srcObject = null;
}
