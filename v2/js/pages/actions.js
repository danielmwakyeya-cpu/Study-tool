import { ensureDailyBackup, exportPayload, mergeImport, prepareImport, readV1Local, restoreBackup } from "../backup.js";
import { RECORD_STORES } from "../db.js";
import { DEADLINE_ZONE, formatDual, zonedTimeToUtc } from "../dates.js";
import { exampleCourseRecords, EXAMPLE_COURSE_ID } from "../seed.js";
import { blankSchedule, cardKey, reviewCard } from "../srs.js";
import {
  emit,
  forgetConflict,
  getRecord,
  list,
  listAll,
  removeRecord,
  replaceAll,
  saveMany,
  saveRecord,
  store,
  updateSettings
} from "../store.js";
import { signInGoogle, signOutGoogle } from "../sync.js";
import { choiceModal, confirmModal, formModal, sanitizeHtml, toast } from "../ui.js";
import { go } from "../router.js";
import { COURSE_COLOURS, ITEM_TYPES, courseHref, downloadText, esc, hashString, numOrNull, stripHtml, uid } from "../util.js";
import { byPosition, modulesFor, itemsForModule } from "../queries.js";

let inputTimer = 0;

export function installActions() {
  const app = document.getElementById("app");
  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.matches("input, textarea, select")) return;
    const action = button.dataset.action;
    if (action === "menu") document.querySelector(".app")?.classList.toggle("nav-open");
    else if (action === "close-menu") document.querySelector(".app")?.classList.remove("nav-open");
    else if (action === "theme") toggleTheme();
    else if (action === "sign-in") signInGoogle().catch((error) => toast(error.message || "Sign-in failed"));
    else if (action === "sign-out") signOutGoogle().then(() => toast("Signed out. Your work is still on this device.")).catch((error) => toast(error.message));
    else if (action === "format") formatEditor(button);
    else if (action === "reveal") document.querySelector(".flash-back")?.removeAttribute("hidden");
    else handleAction(action, button);
  });
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.action === "search-form") {
      const q = new FormData(form).get("q")?.toString().trim() || "";
      go(q ? `#/search?q=${encodeURIComponent(q)}` : "#/search");
    } else if (form.dataset.action === "capture-form") {
      const text = new FormData(form).get("text")?.toString().trim() || "";
      if (!text) return;
      saveRecord("captures", { id: uid("cap_"), text, example: false, createdAt: Date.now(), deleted: false }).then(() => toast("Capture saved"));
    }
  });
  app.addEventListener("input", (event) => {
    const field = event.target.closest("[data-field], [data-rubric]");
    if (!field || field.matches("select, input[type=checkbox], input[type=date], input[type=time], input[type=datetime-local]")) return;
    if (field.dataset.field === "reflection") {
      const out = document.getElementById("word-count");
      if (out) out.textContent = `${stripHtml(field.innerHTML).split(/\s+/).filter(Boolean).length} words`;
    }
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => commitField(field), 280);
  });
  app.addEventListener("change", async (event) => {
    if (event.target?.id === "import-file") {
      const input = event.target;
      if (!input.files?.[0]) return;
      try {
        const text = await input.files[0].text();
        await runImport(JSON.parse(text));
      } catch (error) {
        toast(error.message || "That file could not be imported.");
      }
      input.value = "";
      return;
    }
    const field = event.target.closest("[data-field], [data-due-part], [data-rubric], [data-action='link-item'], [data-action='pick-image']");
    if (!field) return;
    if (field.dataset.action === "pick-image") return addImage(field);
    if (field.dataset.action === "link-item") return linkItem(field);
    if (field.dataset.duePart) return commitDue(field.dataset.id);
    commitField(field);
  });
  app.addEventListener("focusout", (event) => {
    const field = event.target.closest?.("[data-field], [data-rubric]");
    if (field) commitField(field);
  });
  document.getElementById("app").addEventListener("click", (event) => {
    if (event.target.closest("a")) document.querySelector(".app")?.classList.remove("nav-open");
  });
}

async function handleAction(action, button) {
  try {
    if (action === "add-course") return addCourse();
    if (action === "edit-course") return editCourse(button.dataset.id);
    if (action === "load-example") return loadExample();
    if (action === "delete-example") return deleteExample();
    if (action === "add-module") return addModule(button.dataset.course);
    if (action === "delete-module") return deleteModule(button.dataset.id);
    if (action === "add-item") return addItem(button.dataset.module);
    if (action === "delete-item") return deleteItem(button.dataset.id);
    if (action === "toggle-done") return toggleDone(button.dataset.id);
    if (action === "move") return moveRecord(button.dataset.kind, button.dataset.id, Number(button.dataset.dir));
    if (action === "renumber") return renumber(button.dataset.course);
    if (action === "add-assignment") return addAssignment(button.dataset.course);
    if (action === "delete-assignment") return deleteAssignment(button.dataset.id);
    if (action === "add-journal") return addJournal(button.dataset.course);
    if (action === "delete-journal") return deleteJournal(button.dataset.id);
    if (action === "delete-capture") return removeRecord("captures", button.dataset.id);
    if (action === "add-qa") return addNested(button.dataset.id, "qa", { id: uid("qa_"), question: "", answer: "" });
    if (action === "add-reading") return addNested(button.dataset.id, "readings", { id: uid("read_"), text: "", done: false, chapterId: "" });
    if (action === "add-objective") return addNested(button.dataset.id, "objectives", { id: uid("obj_"), text: "", color: "#F5D98B" });
    if (action === "add-slide") return addNested(button.dataset.id, "slides", { id: uid("slide_"), title: "Slide", body: "" });
    if (action === "delete-nested") return deleteNested(button.dataset.id, button.dataset.nested, button.dataset.row);
    if (action === "delete-highlight") return deleteNested(button.dataset.id, "highlights", button.dataset.row);
    if (action === "delete-attachment") return deleteNested(button.dataset.id, "attachments", button.dataset.row);
    if (action === "add-link") return addLink(button.dataset.id);
    if (action === "add-image") return document.getElementById("image-picker")?.click();
    if (action === "add-book") return addBook(button.dataset.course);
    if (action === "add-chapter") return addChapter(button.dataset.id);
    if (action === "delete-book") return deleteBook(button.dataset.id);
    if (action === "build-cards") return buildCards();
    if (action === "rate") return rateCard(button.dataset.id, button.dataset.rating);
    if (action === "export-json") return exportJson();
    if (action === "import-json") return document.getElementById("import-file")?.click();
    if (action === "import-v1") return importV1();
    if (action === "restore-backup") return restore(button.dataset.id);
    if (action === "keep-conflict") return resolveConflict(button.dataset.id, button.dataset.which);
    if (action === "paste-rubric") return pasteRubric(button.dataset.id);
    if (action === "add-criterion") return addCriterion(button.dataset.id);
    if (action === "add-level") return addLevel(button.dataset.id);
  } catch (error) {
    console.error(error);
    toast(error.message || "That did not work.");
  }
}

function toggleTheme() {
  const theme = store.settings.theme === "dark" ? "light" : "dark";
  updateSettings({ theme });
}

async function addCourse() {
  const data = await formModal({
    title: "Add a unit",
    confirmLabel: "Add unit",
    fields: [
      { name: "code", label: "Unit code", value: "", required: true },
      { name: "title", label: "Title", value: "", required: true },
      { name: "canvasUrl", label: "Canvas home URL", value: "" }
    ]
  });
  if (!data?.code && !data?.title) return;
  const id = uid("course_");
  await saveRecord("courses", {
    id,
    code: data.code.trim(),
    title: data.title.trim() || data.code.trim(),
    color: COURSE_COLOURS[list("courses").length % COURSE_COLOURS.length],
    canvasUrl: data.canvasUrl.trim(),
    term: "",
    startDate: "",
    timezone: DEADLINE_ZONE,
    example: false,
    deleted: false
  });
  go(courseHref(id));
}

async function editCourse(id) {
  const course = getRecord("courses", id);
  if (!course) return;
  const data = await formModal({
    title: "Edit unit",
    fields: [
      { name: "code", label: "Unit code", value: course.code || "" },
      { name: "title", label: "Title", value: course.title || "" },
      { name: "term", label: "Semester or term", value: course.term || "" },
      { name: "canvasUrl", label: "Canvas home URL", value: course.canvasUrl || "" },
      { name: "color", label: "Colour", type: "select", value: course.color, options: COURSE_COLOURS.map((color) => ({ value: color, label: color })) }
    ]
  });
  if (!data) return;
  await saveRecord("courses", { ...course, ...data, code: data.code.trim(), title: data.title.trim() });
}

async function loadExample() {
  const existing = getRecord("courses", EXAMPLE_COURSE_ID);
  if (existing && !existing.deleted) {
    toast("The example unit is already loaded.");
    go(courseHref(EXAMPLE_COURSE_ID));
    return;
  }
  await saveMany(exampleCourseRecords());
  toast("Example unit loaded. Delete it from Settings whenever you like.");
  go(courseHref(EXAMPLE_COURSE_ID));
}

async function deleteExample() {
  const ok = await confirmModal({
    title: "Delete example data?",
    body: "This removes the example COU6508 unit, its cards, and the example reading list. Your other units stay.",
    confirmLabel: "Delete example",
    danger: true
  });
  if (!ok) return;
  for (const name of RECORD_STORES) {
    for (const rec of listAll(name)) {
      if (rec.example && !rec.deleted) await removeRecord(name, rec.id, { silent: true });
    }
  }
  emit();
  toast("Example data deleted.");
  go("#/dashboard");
}

async function addModule(courseId) {
  const mods = modulesFor(courseId);
  const data = await formModal({
    title: "Add a module",
    fields: [
      { name: "number", label: "Module number", value: String((mods.at(-1)?.number || 0) + 1) },
      { name: "title", label: "Title", value: `Week ${(mods.at(-1)?.number || 0) + 1}`, required: true }
    ]
  });
  if (!data) return;
  await saveRecord("modules", {
    id: uid("mod_"),
    courseId,
    number: Number(data.number) || mods.length + 1,
    position: mods.length,
    title: data.title.trim(),
    example: false,
    deleted: false
  });
}

async function deleteModule(id) {
  const mod = getRecord("modules", id);
  if (!mod) return;
  const ok = await confirmModal({ title: "Delete this module?", body: `Delete ${mod.title} and the items inside it?`, confirmLabel: "Delete", danger: true });
  if (!ok) return;
  await removeRecord("modules", id, { silent: true });
  for (const item of listAll("items")) {
    if (item.moduleId === id && !item.deleted) await removeRecord("items", item.id, { silent: true });
  }
  emit();
}

async function addItem(moduleId) {
  const mod = getRecord("modules", moduleId);
  if (!mod) return;
  const items = itemsForModule(moduleId);
  const data = await formModal({
    title: "Add an item",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "type", label: "Type", type: "select", value: "page", options: ITEM_TYPES.map((type) => ({ value: type.id, label: type.label })) }
    ]
  });
  if (!data?.title) return;
  const id = uid("item_");
  const numberLabel = `${mod.number}.${items.length + 1}`;
  await saveRecord("items", blankItem({ id, courseId: mod.courseId, moduleId, position: items.length, numberLabel, title: data.title.trim(), type: data.type }));
  go(courseHref(mod.courseId, "item", id));
}

function blankItem(partial) {
  return {
    canvasUrl: "",
    notes: "",
    reflection: "",
    sourceText: "",
    sourceRange: "",
    readings: [],
    apaReference: "",
    url: "",
    attachments: [],
    tags: [],
    highlights: [],
    qa: [],
    objectives: [],
    footnotes: [],
    comments: [],
    slideshows: [],
    hotspotActivities: [],
    slides: [],
    assessment: "",
    flagged: false,
    done: false,
    doneAt: null,
    date: "",
    recordingUrl: "",
    transcript: "",
    label: "",
    example: false,
    deleted: false,
    ...partial
  };
}

async function deleteItem(id) {
  const item = getRecord("items", id);
  if (!item) return;
  const ok = await confirmModal({ title: "Delete this item?", body: `Delete ${item.numberLabel || ""} ${item.title}?`.trim(), confirmLabel: "Delete", danger: true });
  if (!ok) return;
  await removeRecord("items", id);
  go(courseHref(item.courseId, "modules"));
}

async function toggleDone(id) {
  const item = getRecord("items", id);
  if (!item) return;
  const done = !item.done;
  await saveRecord("items", { ...item, done, doneAt: done ? Date.now() : null });
}

async function moveRecord(kind, id, dir) {
  const rec = getRecord(kind, id);
  if (!rec) return;
  const siblings = list(kind)
    .filter((row) => kind === "modules" ? row.courseId === rec.courseId : row.moduleId === rec.moduleId)
    .sort(byPosition)
    .map((row, index) => ({ ...row, position: index }));
  const index = siblings.findIndex((row) => row.id === id);
  const target = index + dir;
  if (target < 0 || target >= siblings.length) return;
  const reordered = siblings.slice();
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);
  for (let i = 0; i < reordered.length; i += 1) {
    await saveRecord(kind, { ...reordered[i], position: i }, { silent: true });
  }
  emit();
}

async function renumber(courseId) {
  for (const mod of modulesFor(courseId)) {
    const items = itemsForModule(mod.id);
    for (let i = 0; i < items.length; i += 1) {
      await saveRecord("items", { ...items[i], position: i, numberLabel: `${mod.number}.${i + 1}` }, { silent: true });
    }
  }
  emit();
  toast("Items renumbered.");
}

async function addAssignment(courseId) {
  const id = uid("asg_");
  await saveRecord("assignments", {
    id,
    courseId,
    title: "New assignment",
    dueAt: null,
    timezone: DEADLINE_ZONE,
    weighting: null,
    wordCount: null,
    rubric: { columns: ["Needs work", "Developing", "Accomplished"], rows: [] },
    status: "not_started",
    submittedAt: null,
    turnitin: null,
    mark: null,
    markOutOf: 100,
    feedback: "",
    linkedItemIds: [],
    notes: "",
    example: false,
    deleted: false
  });
  go(courseHref(courseId, "assignment", id));
}

async function deleteAssignment(id) {
  const row = getRecord("assignments", id);
  if (!row) return;
  const ok = await confirmModal({ title: "Delete this assignment?", body: `Delete ${row.title}?`, confirmLabel: "Delete", danger: true });
  if (!ok) return;
  await removeRecord("assignments", id);
  go(courseHref(row.courseId, "assignments"));
}

async function addJournal(courseId) {
  const id = uid("journal_");
  await saveRecord("journal", { id, courseId, title: "New entry", date: new Date().toISOString().slice(0, 10), body: "", position: Date.now(), example: false, deleted: false });
  go(courseHref(courseId, "journal", id));
}

async function deleteJournal(id) {
  const row = getRecord("journal", id);
  if (!row) return;
  await removeRecord("journal", id);
  go(courseHref(row.courseId, "journal"));
}

async function addNested(itemId, key, row) {
  const item = getRecord("items", itemId);
  if (!item) return;
  await saveRecord("items", { ...item, [key]: [...(item[key] || []), row] });
}

async function deleteNested(itemId, key, rowId) {
  const item = getRecord("items", itemId);
  if (!item) return;
  await saveRecord("items", { ...item, [key]: (item[key] || []).filter((row) => row.id !== rowId) });
}

async function addLink(itemId) {
  const data = await formModal({
    title: "Add a link",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "url", label: "URL", required: true }
    ]
  });
  if (!data?.url) return;
  await addNested(itemId, "attachments", { id: uid("file_"), name: data.name.trim() || data.url.trim(), url: data.url.trim(), kind: "link" });
}

function addImage(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > 900000) {
    toast("That image is over 900 KB. Link to it instead, so this device does not fill up.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = String(reader.result || "");
    const blobId = uid("blob_");
    const localOnly = dataUrl.length > 150000;
    await saveRecord("blobs", { id: blobId, name: file.name, mime: file.type, dataUrl, localOnly, example: false, deleted: false }, { silent: true });
    await addNested(input.dataset.id, "attachments", { id: uid("file_"), name: file.name, blobId, kind: "image", localOnly });
    if (localOnly) toast("Image saved on this device. It is too big to sync.");
  };
  reader.readAsDataURL(file);
}

async function addBook(courseId) {
  const data = await formModal({
    title: "Add a book",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "author", label: "Author", value: "" },
      { name: "fullReference", label: "APA reference", type: "textarea", value: "" }
    ]
  });
  if (!data?.title) return;
  const id = uid("book_");
  await saveRecord("books", { id, courseId, title: data.title.trim(), author: data.author.trim(), fullReference: data.fullReference.trim(), inTextCitation: "", color: "#9d3f2c", chapters: [], example: false, deleted: false });
  go(`#/library/${id}`);
}

async function addChapter(bookId) {
  const book = getRecord("books", bookId);
  if (!book) return;
  const data = await formModal({ title: "Add a chapter", fields: [{ name: "title", label: "Title", required: true }] });
  if (!data?.title) return;
  const chapter = { id: uid("ch_"), title: data.title.trim(), tags: [], notes: "", sourceText: "", sourceRange: "", qa: [], footnotes: [], comments: [], updatedAt: Date.now() };
  await saveRecord("books", { ...book, chapters: [...(book.chapters || []), chapter] });
  go(`#/library/${bookId}/${chapter.id}`);
}

async function deleteBook(id) {
  const book = getRecord("books", id);
  if (!book) return;
  const ok = await confirmModal({ title: "Delete this book?", body: `Delete ${book.title} and its chapters?`, confirmLabel: "Delete", danger: true });
  if (!ok) return;
  await removeRecord("books", id);
  go(book.courseId ? courseHref(book.courseId, "files") : "#/dashboard");
}

function fieldValue(el) {
  if (el.dataset.multiline === "true" || el.isContentEditable) return sanitizeHtml(el.innerHTML);
  if (el.type === "checkbox") return el.checked;
  if (["weighting", "wordCount", "turnitin", "mark", "markOutOf"].includes(el.dataset.field)) return numOrNull(el.value);
  if (el.dataset.field === "tags") return el.value.split(",").map((tag) => tag.trim()).filter(Boolean);
  if (el.dataset.field === "submittedAt") return el.value ? new Date(el.value).toISOString() : null;
  return el.value;
}

async function commitField(el) {
  if (!el || el.dataset.rubric) return commitRubric(el);
  if (el.dataset.book) return commitChapter(el);
  const collection = el.dataset.collection;
  const id = el.dataset.id;
  if (!collection || !id) return;
  const rec = getRecord(collection, id);
  if (!rec) return;
  const value = fieldValue(el);
  if (el.dataset.nested) {
    const latest = getRecord(collection, id) || rec;
    const nested = (latest[el.dataset.nested] || []).map((row) => row.id === el.dataset.row ? { ...row, [el.dataset.field]: value } : row);
    if (JSON.stringify(nested) === JSON.stringify(latest[el.dataset.nested] || [])) return;
    await saveRecord(collection, { id, [el.dataset.nested]: nested }, { silent: true });
    return;
  }
  const current = rec[el.dataset.field];
  if (JSON.stringify(current) === JSON.stringify(value)) return;
  const next = { id, [el.dataset.field]: value };
  if (el.dataset.field === "status" && value === "submitted" && !rec.submittedAt) next.submittedAt = new Date().toISOString();
  if (el.dataset.field === "status" && value === "graded" && rec.mark == null) toast("Add the mark when you have it. The grade page uses status Graded.");
  const structural = el.matches("select, input[type=checkbox]");
  await saveRecord(collection, next, { silent: !structural });
}

async function commitChapter(el) {
  const book = getRecord("books", el.dataset.book);
  if (!book) return;
  const value = el.dataset.multiline === "true" || el.isContentEditable ? sanitizeHtml(el.innerHTML) : el.value;
  const chapters = (book.chapters || []).map((chapter) => chapter.id === el.dataset.chapter ? { ...chapter, [el.dataset.field]: value, updatedAt: Date.now() } : chapter);
  await saveRecord("books", { id: book.id, chapters }, { silent: true });
}

async function commitDue(id) {
  const box = document.querySelector(`[data-due-for="${CSS.escape(id)}"]`);
  const row = getRecord("assignments", id);
  if (!box || !row) return;
  const date = box.querySelector('[data-due-part="date"]').value;
  const time = box.querySelector('[data-due-part="time"]').value || "23:59";
  const zone = box.querySelector('[data-due-part="zone"]').value || DEADLINE_ZONE;
  const dueAt = date ? zonedTimeToUtc(date, time, zone) : null;
  await saveRecord("assignments", { id: row.id, dueAt, timezone: zone }, { silent: true });
  const preview = document.getElementById("due-preview");
  if (preview) {
    if (!dueAt) preview.textContent = "Add a date to see both clocks.";
    else {
      const when = formatDual(dueAt, zone);
      preview.innerHTML = `<strong>${esc(when.deadline)}</strong><br>Adelaide: ${esc(when.home)}`;
    }
  }
}

async function commitRubric(el) {
  if (!el?.dataset?.rubric) return;
  const row = getRecord("assignments", el.dataset.id);
  if (!row) return;
  const rubric = structuredClone(row.rubric || { columns: [], rows: [] });
  if (el.dataset.rubric === "column") rubric.columns[Number(el.dataset.col)] = el.value;
  if (el.dataset.rubric === "criterion") {
    const line = rubric.rows.find((item) => item.id === el.dataset.row);
    if (line) line.criterion = el.value;
  }
  if (el.dataset.rubric === "cell") {
    const line = rubric.rows.find((item) => item.id === el.dataset.row);
    if (line) {
      line.cells = line.cells || [];
      line.cells[Number(el.dataset.col)] = el.value;
    }
  }
  await saveRecord("assignments", { id: el.dataset.id, rubric }, { silent: true });
}

function linkItem(el) {
  const row = getRecord("assignments", el.dataset.id);
  if (!row) return;
  const ids = new Set(row.linkedItemIds || []);
  if (el.checked) ids.add(el.dataset.item);
  else ids.delete(el.dataset.item);
  saveRecord("assignments", { id: row.id, linkedItemIds: [...ids] }, { silent: true });
}

async function pasteRubric(id) {
  const row = getRecord("assignments", id);
  if (!row) return;
  const data = await formModal({
    title: "Paste a rubric",
    intro: "Copy a table from a spreadsheet. The first row is the level names, and the first column is the criterion.",
    confirmLabel: "Use this table",
    fields: [{ name: "table", label: "Table", type: "textarea", rows: 8 }]
  });
  if (!data?.table.trim()) return;
  const lines = data.table.split(/\r?\n/).map((line) => line.split("\t")).filter((line) => line.some((cell) => cell.trim()));
  if (lines.length < 2) {
    toast("Paste at least a header row and one criterion, with columns separated by tabs.");
    return;
  }
  const columns = lines[0].slice(1).map((cell) => cell.trim() || "Level");
  const rows = lines.slice(1).map((line) => ({
    id: uid("rub_"),
    criterion: line[0]?.trim() || "Criterion",
    cells: columns.map((_, index) => line[index + 1]?.trim() || "")
  }));
  await saveRecord("assignments", { ...row, rubric: { columns, rows } });
}

async function addCriterion(id) {
  const row = getRecord("assignments", id);
  const rubric = structuredClone(row.rubric || { columns: ["Needs work", "Developing", "Accomplished"], rows: [] });
  rubric.rows.push({ id: uid("rub_"), criterion: "New criterion", cells: rubric.columns.map(() => "") });
  await saveRecord("assignments", { ...row, rubric });
}

async function addLevel(id) {
  const row = getRecord("assignments", id);
  const rubric = structuredClone(row.rubric || { columns: [], rows: [] });
  rubric.columns.push("New level");
  rubric.rows.forEach((line) => {
    line.cells = line.cells || [];
    line.cells.push("");
  });
  await saveRecord("assignments", { ...row, rubric });
}

async function buildCards() {
  const existing = new Set(list("cards").map((card) => cardKey(card.itemId, card.front)));
  const fresh = [];
  for (const item of list("items")) {
    const pairs = [];
    for (const qa of item.qa || []) {
      if (qa.question && qa.answer) pairs.push([qa.question.trim(), qa.answer.trim()]);
    }
    for (const highlight of item.highlights || []) {
      if (highlight.text) pairs.push([highlight.text.trim(), `Highlight from ${item.numberLabel || ""} ${item.title}`.trim()]);
    }
    for (const match of String(item.notes || "").matchAll(/<mark[^>]*>([\s\S]*?)<\/mark>/gi)) {
      const text = stripHtml(match[1]);
      if (text) pairs.push([text, `From ${item.numberLabel || ""} ${item.title}`.trim()]);
    }
    for (const [front, back] of pairs) {
      const key = cardKey(item.id, front);
      if (existing.has(key)) continue;
      existing.add(key);
      fresh.push({
        id: `card_${item.id}_${hashString(front)}`,
        courseId: item.courseId,
        itemId: item.id,
        front,
        back,
        example: !!item.example,
        ...blankSchedule(Date.now() - 1000),
        deleted: false
      });
    }
  }
  if (!fresh.length) {
    toast("No new cards. Add a highlight or a question and answer first.");
    return;
  }
  await saveMany({ cards: fresh });
  toast(`${fresh.length} card${fresh.length === 1 ? "" : "s"} added to the queue.`);
  go("#/revision");
}

async function rateCard(id, rating) {
  const card = getRecord("cards", id);
  if (!card) return;
  const schedule = reviewCard(card, rating);
  await saveRecord("cards", { ...card, ...schedule }, { silent: true });
  await saveRecord("reviews", { id: uid("rev_"), cardId: id, rating, at: Date.now(), example: !!card.example, deleted: false });
}

async function formatEditor(button) {
  const editor = document.getElementById(button.dataset.target);
  if (!editor) return;
  editor.focus();
  const cmd = button.dataset.cmd;
  if (cmd === "hilite") {
    const selected = document.getSelection()?.toString().trim() || "";
    if (selected) document.execCommand("insertHTML", false, `<mark>${esc(selected)}</mark>`);
    if (selected) {
      const item = getRecord("items", editor.dataset.id);
      if (item && !(item.highlights || []).some((row) => row.text === selected)) {
        await saveRecord("items", { ...item, highlights: [...(item.highlights || []), { id: uid("hl_"), text: selected, color: "#F5D98B", createdAt: Date.now() }] }, { silent: true });
      }
    }
  } else if (cmd === "link") {
    const selection = document.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    const data = await formModal({ title: "Insert a link", fields: [{ name: "url", label: "https:// address", required: true }] });
    editor.focus();
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (data?.url && /^https?:\/\//i.test(data.url.trim())) document.execCommand("createLink", false, data.url.trim());
  } else {
    document.execCommand(cmd, false, null);
  }
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

function exportJson() {
  const day = new Date().toISOString().slice(0, 10);
  downloadText(`study-hub-${day}.json`, JSON.stringify(exportPayload(), null, 2));
  toast("Backup downloaded.");
}

async function importV1() {
  let parsed;
  try {
    parsed = await readV1Local();
  } catch (error) {
    toast(error.message);
    return;
  }
  if (!parsed) {
    toast("No version 1 data was found in this browser. Export JSON from the original tool, or use Import JSON.");
    return;
  }
  await runImport(parsed);
}

async function restore(id) {
  const ok = await confirmModal({
    title: "Restore this snapshot?",
    body: "This replaces what is currently on this device with that day's snapshot. A fresh snapshot of today is kept first.",
    confirmLabel: "Restore",
    danger: true
  });
  if (!ok) return;
  await ensureDailyBackup();
  await restoreBackup(id);
  toast("Snapshot restored.");
  go("#/dashboard");
}

async function resolveConflict(id, which) {
  const conflict = store.conflicts.find((row) => row.id === id);
  if (!conflict) return;
  if (conflict.collection === "settings") {
    if (which === "local") await updateSettings({ ...conflict.local, updatedAt: Date.now() });
    else await updateSettings(conflict.remote, { remote: true, keepTimestamp: true });
  } else if (which === "local") {
    await saveRecord(conflict.collection, { ...conflict.local, updatedAt: Date.now() });
  } else {
    await saveRecord(conflict.collection, conflict.remote, { remote: true, keepTimestamp: true });
  }
  await forgetConflict(id);
  toast(which === "local" ? "Kept this device's copy." : "Kept the cloud copy.");
}

export async function runImport(parsed) {
  const prepared = prepareImport(parsed);
  const counts = RECORD_STORES.map((name) => {
    const n = (prepared.collections[name] || []).length;
    return n ? `${n} ${name}` : "";
  }).filter(Boolean).join(", ");
  if (prepared.kind === "v1") {
    const ok = await confirmModal({
      title: "Merge version 1 data?",
      body: `This adds ${counts || "the imported records"} into Study Hub. Nothing already here is deleted. You can still open version 1 afterwards.`,
      confirmLabel: "Merge"
    });
    if (!ok) return;
    await mergeImport(prepared.collections);
    toast("Version 1 data merged.");
    go("#/dashboard");
    return;
  }
  const choice = await choiceModal({
    title: "Import backup",
    body: `Found ${counts || "records"}. Merge keeps what you have and updates matching items. Replace asks you to confirm before it removes what is on this device.`,
    choices: [
      { value: "cancel", label: "Cancel" },
      { value: "merge", label: "Merge", primary: true },
      { value: "replace", label: "Replace…", danger: true }
    ]
  });
  if (choice === "replace") {
    const ok = await confirmModal({
      title: "Replace everything on this device?",
      body: "Daily snapshots already stored on this device are kept. This cannot be undone except by restoring one of them.",
      confirmLabel: "Replace everything",
      danger: true
    });
    if (!ok) return;
    await replaceAll(prepared.collections);
    toast("Replaced with the imported file.");
  } else if (choice === "merge") {
    await mergeImport(prepared.collections);
    toast("Merged into your study hub.");
  } else return;
  go("#/dashboard");
}

