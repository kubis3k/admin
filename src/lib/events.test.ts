import { describe, it, expect } from "vitest";
import { validateEventInput } from "./events";

describe("validateEventInput", () => {
  it("validní vstup projde a ořízne/normalizuje hodnoty", () => {
    const result = validateEventInput({
      title: "  Grilovačka  ",
      description: "  Přijďte všichni  ",
      date: "2026-09-28",
      startTime: "18:00",
      imageUrl: "https://example.com/img.jpg",
      isPublished: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        title: "Grilovačka",
        description: "Přijďte všichni",
        date: "2026-09-28",
        startTime: "18:00",
        imageUrl: "https://example.com/img.jpg",
        isPublished: true,
      });
    }
  });

  it("prázdný title je odmítnut", () => {
    const result = validateEventInput({ title: "   ", date: "2026-09-28" });
    expect(result.ok).toBe(false);
  });

  it("title s 201 znaky je odmítnut", () => {
    const result = validateEventInput({
      title: "a".repeat(201),
      date: "2026-09-28",
    });
    expect(result.ok).toBe(false);
  });

  it("title s přesně 200 znaky projde", () => {
    const result = validateEventInput({
      title: "a".repeat(200),
      date: "2026-09-28",
    });
    expect(result.ok).toBe(true);
  });

  it("špatné datum je odmítnuto", () => {
    const result = validateEventInput({ title: "Akce", date: "2026-13-01" });
    expect(result.ok).toBe(false);
  });

  it("špatný čas je odmítnut", () => {
    const result = validateEventInput({
      title: "Akce",
      date: "2026-09-28",
      startTime: "25:00",
    });
    expect(result.ok).toBe(false);
  });

  it("javascript: URL je odmítnuta", () => {
    const result = validateEventInput({
      title: "Akce",
      date: "2026-09-28",
      imageUrl: "javascript:alert(1)",
    });
    expect(result.ok).toBe(false);
  });

  it("ftp:// URL je odmítnuta", () => {
    const result = validateEventInput({
      title: "Akce",
      date: "2026-09-28",
      imageUrl: "ftp://example.com/img.jpg",
    });
    expect(result.ok).toBe(false);
  });

  it("https URL je přijata", () => {
    const result = validateEventInput({
      title: "Akce",
      date: "2026-09-28",
      imageUrl: "https://example.com/a.png",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.imageUrl).toBe("https://example.com/a.png");
  });

  it("prázdné volitelné hodnoty se normalizují na null", () => {
    const result = validateEventInput({
      title: "Akce",
      date: "2026-09-28",
      description: "",
      startTime: "",
      imageUrl: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBeNull();
      expect(result.value.startTime).toBeNull();
      expect(result.value.imageUrl).toBeNull();
      expect(result.value.isPublished).toBe(false);
    }
  });
});
