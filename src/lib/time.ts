const ZONE = "Asia/Jerusalem";

function partsOf(utcMs: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
}

function read(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value);
}

/** Milliseconds to add to UTC to reach the Jerusalem wall clock. */
function jerusalemOffset(utcMs: number): number {
  const parts = partsOf(utcMs);
  const asUtc = Date.UTC(
    read(parts, "year"),
    read(parts, "month") - 1,
    read(parts, "day"),
    read(parts, "hour"),
    read(parts, "minute"),
    read(parts, "second"),
  );
  return asUtc - utcMs;
}

export function fromJerusalemInput(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) {
    throw new Error("תאריך לא תקין");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallAsUtc - jerusalemOffset(wallAsUtc);
  const corrected = jerusalemOffset(instant);
  instant = wallAsUtc - corrected;
  return new Date(instant).toISOString();
}

export function toDatetimeLocal(iso: string): string {
  const parts = partsOf(Date.parse(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMinutes(minutes: number | null): string {
  if (!minutes) return "ללא הערכת זמן";
  return minutes === 1 ? "דקה" : `${minutes} דקות`;
}
