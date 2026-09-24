import { describe, it, expect } from "vitest";
import {
  weekdayOf,
  addDays,
  todayInPrague,
  normalizeTime,
  isValidTime,
  isValidDate,
  computeEffectiveSchedule,
  type WeeklyHours,
  type HourException,
} from "./hours";

describe("weekdayOf", () => {
  it("2026-09-28 je pondělí (0)", () => {
    expect(weekdayOf("2026-09-28")).toBe(0);
  });

  it("2026-09-27 je neděle (6)", () => {
    expect(weekdayOf("2026-09-27")).toBe(6);
  });

  it("2024-02-29 je čtvrtek (3)", () => {
    expect(weekdayOf("2024-02-29")).toBe(3);
  });
});

describe("addDays", () => {
  it("přes konec měsíce", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("přes konec roku", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("přestupný rok", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("záporné n", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("todayInPrague", () => {
  it("letní čas (UTC+2): 22:30 UTC už je další den", () => {
    expect(todayInPrague(new Date("2026-09-24T22:30:00Z"))).toBe("2026-09-25");
  });

  it("letní čas (UTC+2): 21:59 UTC je ještě týž den", () => {
    expect(todayInPrague(new Date("2026-09-24T21:59:00Z"))).toBe("2026-09-24");
  });

  it("zimní čas (UTC+1): 23:30 UTC je další den", () => {
    expect(todayInPrague(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("zimní čas (UTC+1): 22:59 UTC je ještě týž den", () => {
    expect(todayInPrague(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
  });

  it("přechod na zimní čas (25.10.2026)", () => {
    expect(todayInPrague(new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
  });
});

describe("normalizeTime", () => {
  it("ořízne sekundy z formátu Postgresu", () => {
    expect(normalizeTime("09:00:00")).toBe("09:00");
  });
});

describe("isValidTime", () => {
  it.each(["24:00", "9:00", "12:60"])("%s je neplatné", (s) => {
    expect(isValidTime(s)).toBe(false);
  });

  it.each(["00:00", "23:59"])("%s je platné", (s) => {
    expect(isValidTime(s)).toBe(true);
  });
});

describe("isValidDate", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-9-01"])("%s je neplatné", (s) => {
    expect(isValidDate(s)).toBe(false);
  });

  it("2024-02-29 je platné (přestupný rok)", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("2026-02-29 je neplatné (není přestupný rok)", () => {
    expect(isValidDate("2026-02-29")).toBe(false);
  });
});

describe("computeEffectiveSchedule", () => {
  it("den bez řádku v týdenním rozvrhu = zavřeno, source regular", () => {
    const [day] = computeEffectiveSchedule([], [], "2026-09-28", 1);
    expect(day.isOpen).toBe(false);
    expect(day.source).toBe("regular");
    expect(day.opensAt).toBeNull();
    expect(day.closesAt).toBeNull();
  });

  it("weekly rozvrh otevírá den", () => {
    const weekly: WeeklyHours[] = [
      { weekday: 0, opensAt: "09:00", closesAt: "17:00" },
    ];
    const [day] = computeEffectiveSchedule(weekly, [], "2026-09-28", 1);
    expect(day.isOpen).toBe(true);
    expect(day.opensAt).toBe("09:00");
    expect(day.closesAt).toBe("17:00");
    expect(day.source).toBe("regular");
    expect(day.overnight).toBe(false);
  });

  it("výjimka isClosed přebije otevřený den", () => {
    const weekly: WeeklyHours[] = [
      { weekday: 0, opensAt: "09:00", closesAt: "17:00" },
    ];
    const exceptions: HourException[] = [
      {
        date: "2026-09-28",
        isClosed: true,
        customOpensAt: null,
        customClosesAt: null,
        reason: "Svátek",
      },
    ];
    const [day] = computeEffectiveSchedule(weekly, exceptions, "2026-09-28", 1);
    expect(day.isOpen).toBe(false);
    expect(day.source).toBe("exception");
    expect(day.reason).toBe("Svátek");
  });

  it("výjimka s custom časy přebije weekly", () => {
    const weekly: WeeklyHours[] = [
      { weekday: 0, opensAt: "09:00", closesAt: "17:00" },
    ];
    const exceptions: HourException[] = [
      {
        date: "2026-09-28",
        isClosed: false,
        customOpensAt: "12:00",
        customClosesAt: "20:00",
        reason: null,
      },
    ];
    const [day] = computeEffectiveSchedule(weekly, exceptions, "2026-09-28", 1);
    expect(day.isOpen).toBe(true);
    expect(day.opensAt).toBe("12:00");
    expect(day.closesAt).toBe("20:00");
    expect(day.source).toBe("exception");
  });

  it("výjimka otevře den, který v weekly rozvrhu chybí", () => {
    const exceptions: HourException[] = [
      {
        date: "2026-09-28",
        isClosed: false,
        customOpensAt: "10:00",
        customClosesAt: "14:00",
        reason: "Akce",
      },
    ];
    const [day] = computeEffectiveSchedule([], exceptions, "2026-09-28", 1);
    expect(day.isOpen).toBe(true);
    expect(day.opensAt).toBe("10:00");
    expect(day.closesAt).toBe("14:00");
    expect(day.source).toBe("exception");
  });

  it("overnight je true pro 18:00–02:00", () => {
    const weekly: WeeklyHours[] = [
      { weekday: 0, opensAt: "18:00", closesAt: "02:00" },
    ];
    const [day] = computeEffectiveSchedule(weekly, [], "2026-09-28", 1);
    expect(day.overnight).toBe(true);
  });

  it("vrátí přesně `days` dní se správným weekday v každém dni", () => {
    const days = computeEffectiveSchedule([], [], "2026-09-28", 5);
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4]);
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });
});
