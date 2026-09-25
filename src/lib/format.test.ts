import { describe, expect, it } from "vitest";
import { pluralCs, formatDateCs, formatDateTimeCs } from "./format";

describe("pluralCs", () => {
  const w = (n: number) => pluralCs(n, "položka", "položky", "položek");

  it("0 -> many", () => expect(w(0)).toBe("položek"));
  it("1 -> one", () => expect(w(1)).toBe("položka"));
  it("2 -> few", () => expect(w(2)).toBe("položky"));
  it("4 -> few", () => expect(w(4)).toBe("položky"));
  it("5 -> many", () => expect(w(5)).toBe("položek"));
  it("11 -> many", () => expect(w(11)).toBe("položek"));
  it("21 -> many", () => expect(w(21)).toBe("položek"));
  it("22 -> many", () => expect(w(22)).toBe("položek"));
  it("25 -> many", () => expect(w(25)).toBe("položek"));
});

describe("formatDateCs", () => {
  it("s časem", () =>
    expect(formatDateCs("2026-09-30", "18:00")).toBe("st 30. 9. 2026, 18:00"));
  it("bez času", () => expect(formatDateCs("2026-09-30")).toBe("st 30. 9. 2026"));
  it("čas se sekundami se ořízne", () =>
    expect(formatDateCs("2026-09-30", "09:05:00")).toBe("st 30. 9. 2026, 09:05"));
  it("přelom roku", () => expect(formatDateCs("2025-12-31")).toBe("st 31. 12. 2025"));
  it("pondělí", () => expect(formatDateCs("2026-01-05")).toBe("po 5. 1. 2026"));
  it("neděle", () => expect(formatDateCs("2026-01-04")).toBe("ne 4. 1. 2026"));
  it("začátek roku", () => expect(formatDateCs("2026-01-01")).toBe("čt 1. 1. 2026"));
});

describe("formatDateTimeCs", () => {
  it("letní čas (UTC+2)", () =>
    expect(formatDateTimeCs(new Date(Date.UTC(2026, 8, 30, 14, 5)))).toBe(
      "30. 9. 2026 16:05"
    ));
  it("zimní čas (UTC+1) přes přelom roku", () =>
    expect(formatDateTimeCs(new Date(Date.UTC(2025, 11, 31, 23, 0)))).toBe(
      "1. 1. 2026 00:00"
    ));
  it("přijímá ISO string", () =>
    expect(formatDateTimeCs("2026-06-15T10:00:00Z")).toBe("15. 6. 2026 12:00"));
});
