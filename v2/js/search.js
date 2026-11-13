import { stripHtml } from "./util.js";

function hit(kind, title, path, href, extra = "") {
  return { kind, title: title || "Untitled", path, href, extra };
}

export function searchAll(query, data) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const courses = (data.courses || []).filter((c) => !c.deleted);
  const courseName = (id) => {
    const c = courses.find((row) => row.id === id);
    return c ? (c.code ? `${c.code} — ${c.title}` : c.title) : "";
  };
  const hits = [];
  const has = (...parts) => parts.some((part) => String(part || "").toLowerCase().includes(q));

  for (const course of courses) {
    if (has(course.code, course.title, course.term)) {
      hits.push(hit("Course", course.code ? `${course.code} — ${course.title}` : course.title, "Course", `#/course/${encodeURIComponent(course.id)}`));
    }
  }
  for (const mod of data.modules || []) {
    if (mod.deleted) continue;
    if (has(mod.title, mod.number)) {
      hits.push(hit("Module", mod.title, courseName(mod.courseId), `#/course/${encodeURIComponent(mod.courseId)}/modules/${encodeURIComponent(mod.id)}`));
    }
  }
  for (const item of data.items || []) {
    if (item.deleted) continue;
    const notes = stripHtml(item.notes);
    const reflection = stripHtml(item.reflection);
    const readings = (item.readings || []).map((r) => r.text).join(" ");
    const tags = (item.tags || []).join(" ");
    const qa = (item.qa || []).map((row) => `${row.question || ""} ${row.answer || ""}`).join(" ");
    const highlights = (item.highlights || []).map((h) => h.text).join(" ");
    if (has(item.title, item.numberLabel, item.label, item.apaReference, item.assessment, notes, reflection, readings, tags, qa, highlights, stripHtml(item.sourceText), stripHtml(item.transcript))) {
      hits.push(hit(
        item.type || "page",
        `${item.numberLabel ? item.numberLabel + " " : ""}${item.title || "Untitled"}`,
        courseName(item.courseId),
        `#/course/${encodeURIComponent(item.courseId)}/item/${encodeURIComponent(item.id)}`
      ));
    }
  }
  for (const assignment of data.assignments || []) {
    if (assignment.deleted) continue;
    if (has(assignment.title, assignment.feedback, assignment.notes, assignment.status)) {
      hits.push(hit("Assignment", assignment.title, courseName(assignment.courseId), `#/course/${encodeURIComponent(assignment.courseId)}/assignment/${encodeURIComponent(assignment.id)}`));
    }
  }
  for (const book of data.books || []) {
    if (book.deleted) continue;
    if (has(book.title, book.author, book.fullReference)) {
      hits.push(hit("Book", book.title, book.author || "Library", `#/library/${encodeURIComponent(book.id)}`));
    }
    for (const chapter of book.chapters || []) {
      if (has(chapter.title, (chapter.tags || []).join(" "), stripHtml(chapter.notes), stripHtml(chapter.sourceText))) {
        hits.push(hit("Chapter", chapter.title || "Chapter", book.title, `#/library/${encodeURIComponent(book.id)}/${encodeURIComponent(chapter.id)}`));
      }
    }
  }
  for (const entry of data.journal || []) {
    if (entry.deleted) continue;
    if (has(entry.title, stripHtml(entry.body), entry.prompt)) {
      hits.push(hit("Journal", entry.title || "Journal entry", courseName(entry.courseId), `#/course/${encodeURIComponent(entry.courseId)}/journal/${encodeURIComponent(entry.id)}`));
    }
  }
  for (const cap of data.captures || []) {
    if (cap.deleted) continue;
    if (has(cap.text)) hits.push(hit("Capture", cap.text.slice(0, 80), "Quick capture", "#/dashboard"));
  }
  return hits.slice(0, 60);
}
