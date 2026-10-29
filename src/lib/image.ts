/** Pure sizing helpers plus a canvas-based resizer, used before any photo is uploaded. */

export type Size = { width: number; height: number };

/** Scale (width, height) down so the longest side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max: number): Size {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const ratio = max / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** Largest centred square inside (width, height). */
export function centerSquare(
  width: number,
  height: number,
): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
  };
}

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Returns an error message, or null when the picked file can be used. */
export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Please choose a JPG, PNG or WebP image.";
  if (file.size > MAX_INPUT_BYTES)
    return "That image is too large. Choose one under 12 MB.";
  return null;
}

export function extensionFor(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
}

export type ProcessOptions = {
  maxSide: number;
  square?: boolean;
  quality?: number;
};

async function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Resize in the browser and return a compressed WebP (or JPEG where WebP is unsupported). */
export async function processImage(
  file: File,
  options: ProcessOptions,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (options.square) {
      const sq = centerSquare(bitmap.width, bitmap.height);
      sx = sq.sx;
      sy = sq.sy;
      sw = sq.side;
      sh = sq.side;
    }
    const target = fitWithin(sw, sh, options.maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, target.width, target.height);
    const quality = options.quality ?? 0.82;
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    if (!jpeg) throw new Error("Could not process the image");
    return jpeg;
  } finally {
    bitmap.close();
  }
}
