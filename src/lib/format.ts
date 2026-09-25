// Sklonování počítaných podstatných jmen v češtině: 1 / 2-4 / 0,5+.
// n=1 -> one; celé n=2..4 -> few; jinak (0, 5+, desetinná čísla apod.) -> many.
export function pluralCs(n: number, one: string, few: string, many: string): string {
  const isInt = Number.isInteger(n);
  if (isInt && n === 1) return one;
  if (isInt && n >= 2 && n <= 4) return few;
  return many;
}

const WEEKDAY_ABBR_CS = ["po", "út", "st", "čt", "pá", "so", "ne"] as const;

// Formátuje datum uložené jako "YYYY-MM-DD" (bez TZ) do českého tvaru,
// např. "st 30. 9. 2026, 18:00" (bez sekund) nebo "st 30. 9. 2026" bez času.
// Počítáno přes Date.UTC, aby na výsledek neměla vliv TZ prostředí.
export function formatDateCs(date: string, time?: string | null): string {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = neděle
  const weekday = (jsDay + 6) % 7; // 0 = pondělí … 6 = neděle
  const datePart = `${WEEKDAY_ABBR_CS[weekday]} ${d}. ${m}. ${y}`;
  return time ? `${datePart}, ${time.slice(0, 5)}` : datePart;
}

// Formátuje časové razítko (Date nebo ISO string) do českého tvaru v čase
// Europe/Prague, např. "30. 9. 2026 14:05".
export function formatDateTimeCs(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}. ${get("month")}. ${get("year")} ${get("hour")}:${get("minute")}`;
}
