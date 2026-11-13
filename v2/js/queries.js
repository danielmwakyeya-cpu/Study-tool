import { countdownLabel, dateKey, DEADLINE_ZONE, formatDual, HOME_ZONE, weekBounds, zonedTimeToUtc } from "./dates.js";
import { list } from "./store.js";
import { courseHref, itemHref } from "./util.js";

export function byPosition(a, b) {
  return (Number(a.position) || 0) - (Number(b.position) || 0);
}

export function courses() {
  return list("courses").slice().sort((a, b) => String(a.code).localeCompare(String(b.code)) || String(a.title).localeCompare(String(b.title)));
}

export function courseById(id) {
  return list("courses").find((course) => course.id === id) || null;
}

export function modulesFor(courseId) {
  return list("modules").filter((mod) => mod.courseId === courseId).sort(byPosition);
}

export function itemsForModule(moduleId) {
  return list("items").filter((item) => item.moduleId === moduleId).sort(byPosition);
}

export function progressOf(items) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function courseProgress(courseId) {
  return progressOf(list("items").filter((item) => item.courseId === courseId));
}

export function orderedCourseItems(courseId) {
  const rows = [];
  for (const mod of modulesFor(courseId)) {
    for (const item of itemsForModule(mod.id)) rows.push({ module: mod, item });
  }
  return rows;
}

export function assignmentsFor(courseId) {
  return list("assignments")
    .filter((row) => !courseId || row.courseId === courseId)
    .slice()
    .sort((a, b) => String(a.dueAt || "9999").localeCompare(String(b.dueAt || "9999")));
}

function eventTime(value, zone) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return zonedTimeToUtc(value, "17:00", zone);
  return value;
}

export function calendarEvents({ courseId = null, now = Date.now() } = {}) {
  const events = [];
  for (const assignment of list("assignments")) {
    if (courseId && assignment.courseId !== courseId) continue;
    if (!assignment.dueAt) continue;
    const zone = assignment.timezone || DEADLINE_ZONE;
    const course = courseById(assignment.courseId);
    events.push({
      id: assignment.id,
      kind: "assignment",
      title: assignment.title,
      at: assignment.dueAt,
      day: dateKey(new Date(assignment.dueAt).getTime(), zone),
      courseId: assignment.courseId,
      course,
      href: courseHref(assignment.courseId, "assignment", assignment.id),
      status: assignment.status,
      timezone: zone,
      countdown: countdownLabel(assignment.dueAt, now),
      when: formatDual(assignment.dueAt, zone)
    });
  }
  for (const item of list("items")) {
    if (courseId && item.courseId !== courseId) continue;
    if (!item.date) continue;
    const at = eventTime(item.date, HOME_ZONE);
    const course = courseById(item.courseId);
    events.push({
      id: item.id,
      kind: "item",
      title: `${item.numberLabel ? `${item.numberLabel} ` : ""}${item.title}`,
      at,
      day: String(item.date).slice(0, 10),
      courseId: item.courseId,
      course,
      href: itemHref(item),
      status: item.done ? "done" : "open",
      timezone: HOME_ZONE,
      countdown: countdownLabel(at, now),
      when: formatDual(at, HOME_ZONE)
    });
  }
  for (const entry of list("journal")) {
    if (courseId && entry.courseId !== courseId) continue;
    if (!entry.date) continue;
    const at = eventTime(entry.date, HOME_ZONE);
    events.push({
      id: entry.id,
      kind: "journal",
      title: entry.title || "Journal entry",
      at,
      day: String(entry.date).slice(0, 10),
      courseId: entry.courseId,
      course: courseById(entry.courseId),
      href: courseHref(entry.courseId, "journal", entry.id),
      status: "open",
      timezone: HOME_ZONE,
      countdown: countdownLabel(at, now),
      when: formatDual(at, HOME_ZONE)
    });
  }
  events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return events;
}

export function comingUp(now = Date.now()) {
  const horizon = now + 120 * 86400000;
  const past = now - 21 * 86400000;
  return calendarEvents({ now }).filter((event) => {
    const time = new Date(event.at).getTime();
    if (Number.isNaN(time)) return false;
    if (event.kind === "assignment" && event.status === "graded" && time < now) return false;
    return time >= past && time <= horizon;
  });
}

export function weekSummary(now = Date.now()) {
  const bounds = weekBounds(now, HOME_ZONE);
  const doneItems = list("items").filter((item) => item.doneAt && item.doneAt >= Date.parse(bounds.startIso) && item.doneAt <= Date.parse(bounds.endIso) + 60000);
  const due = calendarEvents({ now }).filter((event) => event.day >= bounds.startKey && event.day <= bounds.endKey);
  const reviews = list("reviews").filter((review) => review.at >= Date.parse(bounds.startIso) && review.at <= Date.parse(bounds.endIso) + 60000);
  return { bounds, doneItems, due, reviews };
}
