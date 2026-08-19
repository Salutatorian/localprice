import { describe, expect, it } from "vitest";
import { isAllowedReceiptImage, looksLikeHeic } from "@/server/image";

describe("receipt image acceptance", () => {
  it("accepts HEIC by filename when the browser omits a MIME type", () => {
    expect(isAllowedReceiptImage({ type: "", name: "IMG_1234.HEIC" })).toBe(true);
    expect(isAllowedReceiptImage({ type: "application/octet-stream", name: "scan.heif" })).toBe(
      true,
    );
  });

  it("still rejects non-image files", () => {
    expect(isAllowedReceiptImage({ type: "application/pdf", name: "receipt.pdf" })).toBe(false);
  });

  it("detects HEIC from ISO ftyp brands", () => {
    const header = Buffer.alloc(12);
    header.writeUInt32BE(0, 0);
    header.write("ftyp", 4, "ascii");
    header.write("heic", 8, "ascii");
    expect(looksLikeHeic(header, "photo.bin", "")).toBe(true);
  });
});
