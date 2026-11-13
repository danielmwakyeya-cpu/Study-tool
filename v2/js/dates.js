/** Timezone helpers. ECU deadlines are stored as UTC plus an IANA zone (usually Australia/Perth). */

export const DEADLINE_ZONE = "Australia/Perth";
export const HOME_ZONE = "Australia/Adelaide";

export const ZONES = [
  { id: "Australia/Perth", label: "Australia/Perth (AWST / AWDT)" },
  { id: "Australia/Adelaide", label: "Australia/Adelaide (ACST / ACDT)" },
  { id: "Australia/Sydney", label: "Australia/Sydney (AEST / AEDT)" },
  { id: "Australia/Darwin", label: "Australia/Darwin (ACST)" }
];

export function zonedParts(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const bag = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second)
  };
}

export function dateKey(utcMs, timeZone = HOME_ZONE) {
  const p = zonedParts(utcMs, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Convert a wall-clock date and time in an IANA zone to a UTC ISO string. */
export function zonedTimeToUtc(date, time, timeZone) {
  if (!date) return null;
  const [y, mo, d] = String(date).split("-").map(Number);
  const [h, mi] = String(time || "00:00").split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
  const target = Date.UTC(y, mo - 1, d, h, mi, 0);
  let utc = target;
  for (let i = 0; i < 4; i += 1) {
    const shown = zonedParts(utc, timeZone);
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
    const delta = target - shownAsUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc).toISOString();
}

export function utcToZonedInput(iso, timeZone) {
  if (!iso) return { date: "", time: "" };
  const p = zonedParts(new Date(iso).getTime(), timeZone);
  return {
    date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
    time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
  };
}

export function zoneAbbrev(iso, timeZone) {
  const d = iso ? new Date(iso) : new Date();
  const part = new Intl.DateTimeFormat("en-AU", { timeZone, timeZoneName: "short" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName");
  return part?.value || timeZone;
}

export function formatWhen(iso, timeZone) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(d);
  return `${date} ${zoneAbbrev(iso, timeZone)}`.replace(/\s+/g, " ").trim();
}

export function formatDual(iso, deadlineZone = DEADLINE_ZONE) {
  if (!iso) return { deadline: "", home: "", same: true };
  const deadline = formatWhen(iso, deadlineZone);
  const home = formatWhen(iso, HOME_ZONE);
  return { deadline, home, same: deadlineZone === HOME_ZONE };
}

export function countdownLabel(iso, now = Date.now()) {
  if (!iso) return "";
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return "";
  const diff = due - now;
  const abs = Math.abs(diff);
  const sameDay = dateKey(due, HOME_ZONE) === dateKey(now, HOME_ZONE);
  if (abs < 45 * 60 * 1000) {
    const mins = Math.max(1, Math.round(abs / 60000));
    return diff >= 0 ? `in ${mins} min` : `${mins} min overdue`;
  }
  if (abs < 36 * 3600 * 1000) {
    const hours = Math.max(1, Math.round(abs / 3600000));
    if (sameDay && diff >= 0) return `today · in ${hours} h`;
    return diff >= 0 ? `in ${hours} h` : `${hours} h overdue`;
  }
  const days = Math.max(1, Math.round(abs / 86400000));
  if (diff >= 0) return days === 1 ? "tomorrow" : `in ${days} days`;
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

export function shiftMonth(year, month, delta) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startDow = first.getUTCDay(); // 0 Sun
  const mondayIndex = (startDow + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < mondayIndex; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function weekBounds(now = Date.now(), timeZone = HOME_ZONE) {
  const key = dateKey(now, timeZone);
  const noon = zonedTimeToUtc(key, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date(noon));
  const idx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 1;
  const sinceMonday = (idx + 6) % 7;
  const mondayDate = addDays(key, -sinceMonday);
  const sundayDate = addDays(mondayDate, 6);
  return {
    startKey: mondayDate,
    endKey: sundayDate,
    startIso: zonedTimeToUtc(mondayDate, "00:00", timeZone),
    endIso: zonedTimeToUtc(sundayDate, "23:59", timeZone)
  };
}

export function addDays(dateKeyValue, days) {
  const [y, m, d] = dateKeyValue.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function currentMonthKey(now = Date.now(), timeZone = HOME_ZONE) {
  const key = dateKey(now, timeZone);
  return key.slice(0, 7);
}

export function parseMonth(value, fallback = currentMonthKey()) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return parseMonth(fallback);
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return parseMonth(fallback);
  return { year, month, key: value };
}
