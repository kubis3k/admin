import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  isOurBlobUrl,
  validateAlt,
  MAX_IMAGE_BYTES,
} from "./upload";

describe("validateImageFile", () => {
  it("povolí jpeg/png/webp/avif/gif", () => {
    for (const type of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ]) {
      const result = validateImageFile({ type, size: 1000 });
      expect(result.ok).toBe(true);
    }
  });

  it("odmítne image/svg+xml (může nést skript)", () => {
    const result = validateImageFile({ type: "image/svg+xml", size: 1000 });
    expect(result.ok).toBe(false);
  });

  it("odmítne text/html", () => {
    const result = validateImageFile({ type: "text/html", size: 1000 });
    expect(result.ok).toBe(false);
  });

  it("odmítne application/pdf", () => {
    const result = validateImageFile({ type: "application/pdf", size: 1000 });
    expect(result.ok).toBe(false);
  });

  it("odmítne velikost 0", () => {
    const result = validateImageFile({ type: "image/png", size: 0 });
    expect(result.ok).toBe(false);
  });

  it("přesně MAX_IMAGE_BYTES projde", () => {
    const result = validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES });
    expect(result.ok).toBe(true);
  });

  it("MAX_IMAGE_BYTES + 1 je odmítnuto", () => {
    const result = validateImageFile({
      type: "image/png",
      size: MAX_IMAGE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("isOurBlobUrl", () => {
  it("naše Blob doména projde", () => {
    expect(
      isOurBlobUrl("https://abc123.public.blob.vercel-storage.com/x.png")
    ).toBe(true);
  });

  it("cizí doména neprojde", () => {
    expect(isOurBlobUrl("https://evil.com/x.png")).toBe(false);
  });

  it("http:// (bez TLS) neprojde", () => {
    expect(
      isOurBlobUrl("http://abc123.public.blob.vercel-storage.com/x.png")
    ).toBe(false);
  });

  it("podvržená subdoména s naší doménou jako suffixem hostname neprojde", () => {
    expect(
      isOurBlobUrl("https://x.public.blob.vercel-storage.com.evil.com/x.png")
    ).toBe(false);
  });

  it("javascript: URL neprojde", () => {
    expect(isOurBlobUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("validateAlt", () => {
  it("ořízne bílé znaky", () => {
    expect(validateAlt("  popis  ")).toBe("popis");
  });

  it("omezí na 300 znaků", () => {
    expect(validateAlt("a".repeat(400)).length).toBe(300);
  });
});
