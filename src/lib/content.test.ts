import { describe, it, expect } from "vitest";
import {
  isValidPageKey,
  validateContent,
  MAX_CONTENT_LENGTH,
} from "./content";

describe("isValidPageKey", () => {
  it.each(["about", "kontakt", "o-nas-2"])("validní klíč %s projde", (key) => {
    expect(isValidPageKey(key)).toBe(true);
  });

  it.each(["About", "o nas", "", "../etc", "ú", "a".repeat(51)])(
    "nevalidní klíč %s je odmítnut",
    (key) => {
      expect(isValidPageKey(key)).toBe(false);
    }
  );
});

describe("validateContent", () => {
  it("obsah s přesně 50000 znaky projde", () => {
    const result = validateContent("a".repeat(MAX_CONTENT_LENGTH));
    expect(result.ok).toBe(true);
  });

  it("obsah s 50001 znaky je odmítnut", () => {
    const result = validateContent("a".repeat(MAX_CONTENT_LENGTH + 1));
    expect(result.ok).toBe(false);
  });

  it("CRLF se normalizuje na LF", () => {
    const result = validateContent("řádek1\r\nřádek2\r\n");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("řádek1\nřádek2\n");
    }
  });
});
