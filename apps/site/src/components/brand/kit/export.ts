// Browser-side export of a brand-kit SVG: copy, save as SVG, save as PNG.

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = name;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const downloadSvg = (svg: string, name: string) =>
  save(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);

// Rasterises the SVG on a canvas at exactly width by height pixels.
export async function downloadPng(svg: string, name: string, width: number, height: number): Promise<void> {
  const image = new Image();
  image.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("could not read the SVG"));
    image.src = svgDataUrl(svg);
  });
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) save(blob, `${name}-${width}x${height}.png`);
}
