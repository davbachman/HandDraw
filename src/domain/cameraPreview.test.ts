import { describe, expect, it } from "vitest";
import { getCameraPreviewToggleState } from "./cameraPreview";

describe("getCameraPreviewToggleState", () => {
  it("marks the camera preview as visible when the switch is on", () => {
    expect(getCameraPreviewToggleState(true)).toEqual({
      ariaChecked: "true",
      buttonClassName: "preview-toggle",
      label: "Preview on",
      previewHidden: false,
    });
  });

  it("marks the camera preview as hidden when the switch is off", () => {
    expect(getCameraPreviewToggleState(false)).toEqual({
      ariaChecked: "false",
      buttonClassName: "preview-toggle is-off",
      label: "Preview off",
      previewHidden: true,
    });
  });
});
