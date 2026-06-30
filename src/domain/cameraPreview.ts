export interface CameraPreviewToggleState {
  ariaChecked: "true" | "false";
  buttonClassName: string;
  label: string;
  previewHidden: boolean;
}

export const getCameraPreviewToggleState = (isVisible: boolean): CameraPreviewToggleState => ({
  ariaChecked: isVisible ? "true" : "false",
  buttonClassName: `preview-toggle${isVisible ? "" : " is-off"}`,
  label: isVisible ? "Preview on" : "Preview off",
  previewHidden: !isVisible,
});
