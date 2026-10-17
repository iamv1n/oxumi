import { iconResponse } from "@oxumi/ui/brand/icon";

// The home-screen icon: the mark on its dark navy tile.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return iconResponse(size.width, { tile: true });
}
