/**
 * Map a version 1 export into Study Hub records.
 * v1 shape: { units[], books[], quickCaptures[] }
 * units[].weeks[].days[] hold readings, notes, reflection, objectives, qa, and more.
 * Unknown fields are kept on item.v1 so nothing is dropped.
 */

import { DEADLINE_ZONE } from "./dates.js";
import { hashString, slug, stripHtml, uid } from "./util.js";

const DATA_URL = /^data:([^;,]+)?(;base64)?,/i;

export function isV1Export(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (data.app === "studyhub-v2") return false;
  return Array.isArray(data.units) && Array.isArray(data.books);
}

export function isV2Export(data) {
  return !!data && data.app === "studyhub-v2" && typeof data === "object";
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function inferType(day) {
  const blob = `${day.label || ""} ${day.topic || ""} ${day.assessment || ""}`.toLowerCase();
  if (arr(day.hotspotActivities).length) return "activity";
  if (/journal|reflection/.test(blob)) return "journal";
  if (/discussion|forum|padlet/.test(blob)) return "discussion";
  if (/quiz|revision|exam/.test(blob)) return "quiz";
  if (arr(day.slideshows).length && /vc|zoom|virtual|recording|lecture|class/.test(blob)) return "vc";
  if (arr(day.slideshows).length) return "vc";
  if (arr(day.readings).length && /reading/.test(blob)) return "reading";
  if (arr(day.readings).length && !stripHtml(day.notes) && !stripHtml(day.reflection)) return "reading";
  return "page";
}

function pullDataUrls(value, blobs, seen) {
  if (typeof value === "string") {
    if (!DATA_URL.test(value)) return value;
    if (seen.has(value)) return { blobId: seen.get(value) };
    const id = `blob_v1_${hashString(value.slice(0, 80) + value.length)}`;
    const mime = (value.match(/^data:([^;,]+)/i) || [])[1] || "application/octet-stream";
    blobs.push({
      id,
      name: "Imported image",
      mime,
      dataUrl: value,
      example: false,
      updatedAt: Date.now(),
      deleted: false
    });
    seen.set(value, id);
    return { blobId: id };
  }
  if (Array.isArray(value)) return value.map((entry) => pullDataUrls(entry, blobs, seen));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, inner] of Object.entries(value)) out[key] = pullDataUrls(inner, blobs, seen);
    return out;
  }
  return value;
}

export function migrateV1(raw, options = {}) {
  const now = options.now || Date.now();
  const data = raw && typeof raw === "object" ? raw : {};
  const blobs = [];
  const seen = new Map();
  const warnings = [];
  const courses = [];
  const modules = [];
  const items = [];
  const assignments = [];
  const assessmentMap = new Map();

  arr(data.units).forEach((unit, unitIndex) => {
    if (!unit || typeof unit !== "object") {
      warnings.push("Skipped a unit that was not an object.");
      return;
    }
    const courseId = `v1unit_${unit.id || `idx${unitIndex}`}`;
    courses.push({
      id: courseId,
      code: unit.code || "",
      title: unit.title || "Imported unit",
      color: unit.color || "#1f6f86",
      canvasUrl: unit.canvasUrl || "",
      startDate: unit.startDate || "",
      term: unit.term || "",
      timezone: DEADLINE_ZONE,
      example: false,
      v1: { id: unit.id || null },
      createdAt: now,
      updatedAt: now,
      deleted: false
    });

    const weeks = arr(unit.weeks).slice().sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
    weeks.forEach((week, weekIndex) => {
      if (!week || typeof week !== "object") return;
      const number = Number(week.number || weekIndex + 1);
      const moduleId = `v1week_${unit.id || unitIndex}_${number}_${weekIndex}`;
      modules.push({
        id: moduleId,
        courseId,
        title: week.title || `Week ${number}`,
        number,
        position: weekIndex,
        example: false,
        createdAt: now,
        updatedAt: now,
        deleted: false
      });

      arr(week.days).forEach((day, dayIndex) => {
        if (!day || typeof day !== "object") return;
        const safeDay = pullDataUrls(day, blobs, seen);
        const type = inferType(safeDay);
        const readings = arr(safeDay.readings).map((reading, readingIndex) => ({
          id: reading.id || `v1read_${day.id || dayIndex}_${readingIndex}`,
          text: reading.text || "",
          done: !!reading.done,
          chapterId: reading.chapterId || null
        }));
        const itemId = `v1day_${day.id || `${unitIndex}_${number}_${dayIndex}`}`;
        const title = safeDay.topic || safeDay.label || `Week ${number} item ${dayIndex + 1}`;
        const item = {
          id: itemId,
          courseId,
          moduleId,
          position: dayIndex,
          numberLabel: `${number}.${dayIndex + 1}`,
          type,
          title,
          label: safeDay.label || "",
          canvasUrl: safeDay.canvasUrl || "",
          notes: safeDay.notes || "",
          reflection: safeDay.reflection || "",
          sourceText: safeDay.sourceText || "",
          sourceRange: safeDay.sourceRange || "",
          readings,
          apaReference: type === "reading" ? (readings[0]?.text || "") : "",
          url: "",
          attachments: [],
          tags: safeDay.assessment ? [safeDay.assessment] : [],
          highlights: [],
          qa: arr(safeDay.qa).map((row, i) => ({
            id: row.id || `v1qa_${itemId}_${i}`,
            question: row.question || "",
            answer: row.answer || ""
          })),
          objectives: arr(safeDay.objectives).map((row, i) => ({
            id: row.id || `v1obj_${itemId}_${i}`,
            text: row.text || "",
            color: row.color || "#F5D98B"
          })),
          footnotes: arr(safeDay.footnotes),
          comments: arr(safeDay.comments),
          slideshows: arr(safeDay.slideshows),
          hotspotActivities: arr(safeDay.hotspotActivities),
          assessment: safeDay.assessment || "",
          flagged: !!safeDay.flagged,
          done: !!safeDay.done,
          doneAt: safeDay.done ? (safeDay.updated || now) : null,
          date: safeDay.date || "",
          recordingUrl: "",
          transcript: "",
          slides: arr(safeDay.slideshows).flatMap((deck) => arr(deck.slides).map((slide) => ({
            id: slide.id || uid("slide_"),
            title: slide.title || deck.name || "Slide",
            body: slide.body || ""
          }))),
          example: false,
          v1: safeDay,
          createdAt: safeDay.updated || now,
          updatedAt: safeDay.updated || now,
          deleted: false
        };
        items.push(item);
        if (safeDay.assessment) {
          const key = `${courseId}::${safeDay.assessment}`;
          if (!assessmentMap.has(key)) {
            assessmentMap.set(key, {
              id: `v1asg_${courseId}_${slug(safeDay.assessment)}`,
              courseId,
              title: safeDay.assessment,
              dueAt: null,
              timezone: DEADLINE_ZONE,
              weighting: null,
              wordCount: null,
              rubric: { columns: ["Needs work", "Developing", "Accomplished"], rows: [] },
              status: "not_started",
              submittedAt: null,
              turnitin: null,
              mark: null,
              markOutOf: null,
              feedback: "",
              linkedItemIds: [],
              notes: "Imported from a version 1 assessment tag. Add the due date, weighting, and rubric when you have them.",
              example: false,
              createdAt: now,
              updatedAt: now,
              deleted: false
            });
          }
          assessmentMap.get(key).linkedItemIds.push(itemId);
        }
      });
    });
  });

  for (const assignment of assessmentMap.values()) assignments.push(assignment);

  const books = arr(data.books).map((book, bookIndex) => {
    if (!book || typeof book !== "object") return null;
    const safe = pullDataUrls(book, blobs, seen);
    return {
      id: `v1book_${book.id || bookIndex}`,
      title: safe.title || "Imported book",
      author: safe.author || "",
      fullReference: safe.fullReference || "",
      inTextCitation: safe.inTextCitation || "",
      color: safe.color || "#9d3f2c",
      courseId: null,
      chapters: arr(safe.chapters).map((chapter, chapterIndex) => ({
        id: chapter.id || `v1ch_${book.id || bookIndex}_${chapterIndex}`,
        title: chapter.title || `Chapter ${chapterIndex + 1}`,
        tags: arr(chapter.tags),
        sourceText: chapter.sourceText || "",
        sourceRange: chapter.sourceRange || "",
        notes: chapter.notes || "",
        qa: arr(chapter.qa),
        footnotes: arr(chapter.footnotes),
        comments: arr(chapter.comments),
        assessment: chapter.assessment || "",
        flagged: !!chapter.flagged,
        updatedAt: chapter.updated || now
      })),
      example: false,
      v1: { id: book.id || null },
      createdAt: now,
      updatedAt: now,
      deleted: false
    };
  }).filter(Boolean);

  const captures = arr(data.quickCaptures).map((cap, index) => ({
    id: `v1cap_${cap?.id || index}`,
    text: cap?.text || "",
    createdAt: cap?.created || now,
    updatedAt: cap?.created || now,
    deleted: false,
    example: false
  }));

  return { courses, modules, items, assignments, books, captures, journal: [], cards: [], reviews: [], blobs, warnings };
}
