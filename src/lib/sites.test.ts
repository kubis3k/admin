import { describe, it, expect } from "vitest";
import {
  validateSlug,
  validateSiteName,
  normalizeEmail,
  parseModules,
  RESERVED_SLUGS,
} from "./sites";

describe("validateSlug", () => {
  it.each(RESERVED_SLUGS)("rezervovaný slug %s je odmítnut", (slug) => {
    const result = validateSlug(slug);
    expect(result.ok).toBe(false);
  });

  it("pomlčka na začátku je odmítnuta", () => {
    expect(validateSlug("-admi").ok).toBe(false);
  });

  it("pomlčka na konci je odmítnuta", () => {
    expect(validateSlug("admi-").ok).toBe(false);
  });

  it("slug o 40 znacích projde", () => {
    const slug = "a" + "b".repeat(38) + "c";
    expect(slug.length).toBe(40);
    expect(validateSlug(slug).ok).toBe(true);
  });

  it("slug o 41 znacích je odmítnut", () => {
    const slug = "a" + "b".repeat(39) + "c";
    expect(slug.length).toBe(41);
    expect(validateSlug(slug).ok).toBe(false);
  });

  it("velká písmena jsou odmítnuta", () => {
    expect(validateSlug("Admi").ok).toBe(false);
  });

  it("diakritika je odmítnuta", () => {
    expect(validateSlug("kavárna").ok).toBe(false);
  });

  it("validní slug projde", () => {
    const result = validateSlug("admi-restaurant");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("admi-restaurant");
  });
});

describe("validateSiteName", () => {
  it("prázdný název je odmítnut", () => {
    expect(validateSiteName("   ").ok).toBe(false);
  });

  it("název o 100 znacích projde", () => {
    expect(validateSiteName("a".repeat(100)).ok).toBe(true);
  });

  it("název o 101 znacích je odmítnut", () => {
    expect(validateSiteName("a".repeat(101)).ok).toBe(false);
  });

  it("ořízne bílé znaky", () => {
    const result = validateSiteName("  Restaurace ADMI  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("Restaurace ADMI");
  });
});

describe("normalizeEmail", () => {
  it("odmítne čárku a středník (Auth.js by e-mail ořízl → fantomový účet)", () => {
    expect(normalizeEmail("a@b.cz,x.cz").ok).toBe(false);
    expect(normalizeEmail("a@b.cz;x@y.cz").ok).toBe(false);
  });

  it("ořízne, lowercasuje a normalizuje", () => {
    const result = normalizeEmail("Jan@X.cz ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("jan@x.cz");
  });

  it("e-mail s uvozovkami je odmítnut", () => {
    expect(normalizeEmail('"jan"@x.cz').ok).toBe(false);
  });

  it("e-mail se dvěma zavináči je odmítnut", () => {
    expect(normalizeEmail("jan@x@x.cz").ok).toBe(false);
  });

  it("e-mail bez zavináče je odmítnut", () => {
    expect(normalizeEmail("jan.x.cz").ok).toBe(false);
  });

  it("prázdný e-mail je odmítnut", () => {
    expect(normalizeEmail("   ").ok).toBe(false);
  });

  it("e-mail s mezerou uvnitř je odmítnut", () => {
    expect(normalizeEmail("jan doe@x.cz").ok).toBe(false);
  });
});

describe("parseModules", () => {
  it("vrátí všech 5 klíčů, checkbox 'on' → true", () => {
    const formData = new FormData();
    formData.set("menu", "on");
    formData.set("events", "on");
    const result = parseModules(formData);
    expect(result).toEqual({
      menu: true,
      hours: false,
      events: true,
      gallery: false,
      content: false,
    });
  });

  it("chybějící checkboxy jsou false", () => {
    const formData = new FormData();
    const result = parseModules(formData);
    expect(result).toEqual({
      menu: false,
      hours: false,
      events: false,
      gallery: false,
      content: false,
    });
  });
});
