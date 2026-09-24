// ---------------------------------------------------------------------------
// Čistá logika otevírací doby — žádné importy z "@/…", žádný přístup k DB.
// Díky tomu jde snadno spustit i mimo Next.js (node/testy).
// ---------------------------------------------------------------------------

export const TIMEZONE = "Europe/Prague";

// Český týden: 0 = pondělí … 6 = neděle (ne JS Date#getDay(), kde 0 = neděle).
export const WEEKDAY_NAMES = [
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
  "Neděle",
] as const;

export type WeeklyHours = {
  weekday: number;
  opensAt: string;
  closesAt: string;
};

export type HourException = {
  date: string;
  isClosed: boolean;
  customOpensAt: string | null;
  customClosesAt: string | null;
  reason: string | null;
};

export type EffectiveDay = {
  date: string;
  weekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  overnight: boolean;
  reason: string | null;
  source: "exception" | "regular";
};

// "YYYY-MM-DD" pro dané datum v Europe/Prague (bez závislosti na runtime TZ).
export function todayInPrague(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// 0 = pondělí … 6 = neděle, spočteno z "YYYY-MM-DD" (UTC, bez posunu TZ).
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = neděle
  return (jsDay + 6) % 7;
}

// Přičte (nebo odečte) n dní k "YYYY-MM-DD" přes UTC aritmetiku
// (bezpečné napříč koncem měsíce/roku i přestupnými roky).
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Postgres vrací čas jako "HH:MM:SS" — zkrátí na "HH:MM".
export function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// Sestaví efektivní rozvrh pro `days` dní počínaje `from` ("YYYY-MM-DD").
// Výjimka pro dané datum PŘEBÍJÍ týdenní rozvrh. Den bez výjimky a bez
// řádku v týdenním rozvrhu = zavřeno (source "regular").
export function computeEffectiveSchedule(
  weekly: WeeklyHours[],
  exceptions: HourException[],
  from: string,
  days: number
): EffectiveDay[] {
  const weeklyByDay = new Map(weekly.map((w) => [w.weekday, w]));
  const exceptionByDate = new Map(exceptions.map((e) => [e.date, e]));

  const result: EffectiveDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const weekday = weekdayOf(date);
    const exception = exceptionByDate.get(date);

    if (exception) {
      if (exception.isClosed) {
        result.push({
          date,
          weekday,
          isOpen: false,
          opensAt: null,
          closesAt: null,
          overnight: false,
          reason: exception.reason,
          source: "exception",
        });
      } else {
        const opensAt = exception.customOpensAt as string;
        const closesAt = exception.customClosesAt as string;
        result.push({
          date,
          weekday,
          isOpen: true,
          opensAt,
          closesAt,
          overnight: closesAt < opensAt,
          reason: exception.reason,
          source: "exception",
        });
      }
      continue;
    }

    const regular = weeklyByDay.get(weekday);
    if (!regular) {
      result.push({
        date,
        weekday,
        isOpen: false,
        opensAt: null,
        closesAt: null,
        overnight: false,
        reason: null,
        source: "regular",
      });
      continue;
    }

    result.push({
      date,
      weekday,
      isOpen: true,
      opensAt: regular.opensAt,
      closesAt: regular.closesAt,
      overnight: regular.closesAt < regular.opensAt,
      reason: null,
      source: "regular",
    });
  }

  return result;
}
