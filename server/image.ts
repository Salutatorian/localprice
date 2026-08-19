import { createHash } from "node:crypto";
import convert from "heic-convert";
import sharp from "sharp";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const HEIC_BRANDS = new Set(["heic", "heix", "heif", "heim", "heis", "mif1", "msf1"]);

export function isAllowedReceiptImage(args: { type: string; name: string }): boolean {
  const type = args.type.toLowerCase().trim();
  const name = args.name.toLowerCase();
  if (ALLOWED_TYPES.has(type)) {
    return true;
  }
  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function assertReceiptFile(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("Receipt photos must be 10 MB or smaller.");
  }
  const type = file.type.toLowerCase().trim();
  const unnamedBinary = type === "" || type === "application/octet-stream";
  if (!unnamedBinary && !isAllowedReceiptImage({ type: file.type, name: file.name })) {
    throw new Error("Use a JPEG, PNG, WEBP, or HEIC photo of the receipt.");
  }
}

export function looksLikeHeic(buffer: Buffer, name: string, type: string): boolean {
  const hint = `${name} ${type}`.toLowerCase();
  if (hint.includes("heic") || hint.includes("heif")) {
    return true;
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return HEIC_BRANDS.has(buffer.toString("ascii", 8, 12));
  }
  return false;
}

async function heicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const output = await convert({
      buffer,
      format: "JPEG",
      quality: 0.9,
    });
    return Buffer.from(output);
  } catch {
    throw new Error("Could not read this HEIC photo. Try exporting it as JPEG from Photos.");
  }
}

export async function prepareReceiptImage(
  buffer: Buffer,
  name: string,
  type: string,
): Promise<Buffer> {
  const source = looksLikeHeic(buffer, name, type) ? await heicToJpeg(buffer) : buffer;
  return sharp(source)
    .rotate()
    .resize({ width: 2400, height: 4800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
}

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function perceptualHash(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();

  let hash = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = pixels[y * 9 + x] ?? 0;
      const right = pixels[y * 9 + x + 1] ?? 0;
      hash += left > right ? "1" : "0";
    }
  }
  return hash;
}
