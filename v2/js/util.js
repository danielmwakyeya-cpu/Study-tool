/** Small shared helpers. No browser-only APIs, so tests can import this file. */

export function uid(prefix = "") {
  const id = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}${id}` : id;
}

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

export function stripHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(htmlOrText) {
  const text = stripHtml(htmlOrText);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function hashString(value) {
  let h = 0;
  const s = String(value ?? "");
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "item";
}

export function numOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function downloadText(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ITEM_TYPES = [
  { id: "page", label: "Page" },
  { id: "reading", label: "Reading" },
  { id: "activity", label: "Activity" },
  { id: "vc", label: "VC session" },
  { id: "journal", label: "Journal reflection" },
  { id: "discussion", label: "Discussion" },
  { id: "quiz", label: "Quiz / revision" }
];

export function typeLabel(type) {
  return ITEM_TYPES.find((t) => t.id === type)?.label || "Page";
}

export const ASSIGNMENT_STATUSES = [
  { id: "not_started", label: "Not started" },
  { id: "drafting", label: "Drafting" },
  { id: "submitted", label: "Submitted" },
  { id: "graded", label: "Graded" }
];

export function statusLabel(status) {
  return ASSIGNMENT_STATUSES.find((s) => s.id === status)?.label || "Not started";
}

export const COURSE_COLOURS = ["#1f6f86", "#9d3f2c", "#2f6f4e", "#8a5a12", "#3d4f8c", "#6b4c7a", "#0e2433", "#a8435a"];

export function courseHref(courseId, section = "", id = "") {
  const base = `#/course/${encodeURIComponent(courseId)}`;
  if (!section || section === "home") return base;
  if (id) return `${base}/${section}/${encodeURIComponent(id)}`;
  return `${base}/${section}`;
}

export function itemHref(item) {
  return courseHref(item.courseId, "item", item.id);
}
