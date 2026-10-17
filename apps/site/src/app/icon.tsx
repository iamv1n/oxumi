import { iconResponse } from "@oxumi/ui/brand/icon";

// The favicon: the live logo's mark on a transparent ground.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return iconResponse(size.width);
}
