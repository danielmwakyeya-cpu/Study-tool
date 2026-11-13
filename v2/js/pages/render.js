import { countdownLabel, currentMonthKey, formatDual, formatWhen, HOME_ZONE, monthGrid, monthLabel, parseMonth, shiftMonth, zoneAbbrev } from "../dates.js";
import { icons, typeIcon } from "../icons.js";
import { weightedGrade } from "../grades.js";
import {
  assignmentsFor,
  byPosition,
  calendarEvents,
  comingUp,
  courseById,
  courseProgress,
  courses,
  itemsForModule,
  modulesFor,
  orderedCourseItems,
  progressOf,
  weekSummary
} from "../queries.js";
import { searchAll } from "../search.js";
import { store, list } from "../store.js";
import { sanitizeHtml } from "../ui.js";
import { isDue } from "../srs.js";
import {
  ASSIGNMENT_STATUSES,
  COURSE_COLOURS,
  ITEM_TYPES,
  courseHref,
  esc,
  statusLabel,
  typeLabel,
  wordCount
} from "../util.js";

function progressHtml(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress-wrap"><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${done} of ${total} done"><span style="width:${pct}%"></span></div><span class="progress-label">${total ? `${pct}%` : "No items"}</span></div>`;
}

function courseNav(course, section) {
  const links = [
    ["home", "Home", ""],
    ["modules", "Modules", "modules"],
    ["assignments", "Assignments", "assignments"],
    ["calendar", "Calendar", "calendar"],
    ["files", "Readings / files", "files"],
    ["grades", "Grades", "grades"],
    ["journal", "Notes / journal", "journal"]
  ];
  return `<nav class="course-nav" aria-label="${esc(course.code || course.title)}">
    <a class="course-nav-home" href="${courseHref(course.id)}"><span class="swatch" style="background:${esc(course.color)}"></span><span><strong>${esc(course.code || "Unit")}</strong><em>${esc(course.title)}</em></span></a>
    ${links.map(([id, label, path]) => `<a class="${section === id || (id === "home" && section === "home") ? "active" : ""}" href="${courseHref(course.id, path)}">${label}</a>`).join("")}
  </nav>`;
}

function shell(route, { title, main, aside = "", course = null, section = "home" }) {
  const unitLinks = courses().map((row) => `<a class="unit-link ${route.courseId === row.id ? "active" : ""}" href="${courseHref(row.id)}"><span class="swatch" style="background:${esc(row.color)}"></span><span>${esc(row.code || row.title)}</span></a>`).join("");
  const active = route.name === "course" ? "" : route.name;
  const link = (id, label, href, icon) => `<a class="nav-link ${active === id ? "active" : ""}" href="${href}">${icon}<span>${label}</span></a>`;
  return `<div class="app ${course ? "has-course" : ""}">
    <nav class="global" aria-label="Study Hub">
      <a class="brand" href="#/dashboard">${icons.logo}<span>Study Hub</span></a>
      ${link("dashboard", "Dashboard", "#/dashboard", icons.dashboard)}
      ${link("calendar", "Calendar", "#/calendar", icons.calendar)}
      ${link("revision", "Revision", "#/revision", icons.revision)}
      <p class="nav-label">Units</p>
      <div class="unit-list">${unitLinks || `<p class="nav-empty">No units yet</p>`}</div>
      <div class="nav-spacer"></div>
      <a class="nav-link" href="../index.html">${icons.page}<span>Version 1</span></a>
      ${link("settings", "Settings", "#/settings", icons.settings)}
    </nav>
    <div class="workspace">
      <header class="topbar">
        <button class="icon-btn" type="button" data-action="menu" aria-label="Open menu">${icons.menu}</button>
        <h1 class="top-title">${esc(title)}</h1>
        <form class="top-search" data-action="search-form" role="search">
          <label class="sr-only" for="global-search">Search</label>
          ${icons.search}
          <input id="global-search" type="search" name="q" placeholder="Search everything" value="${esc(route.query.q || "")}">
        </form>
        <span id="sync-pill" data-mode="local">On this device</span>
        <button class="icon-btn" type="button" data-action="theme" aria-label="Toggle dark mode">${store.settings.theme === "dark" ? icons.sun : icons.moon}</button>
        <button class="btn small" type="button" id="account-btn" data-action="sign-in">Sign in</button>
      </header>
      <div class="columns ${aside ? "with-aside" : ""}">
        ${course ? courseNav(course, section) : ""}
        <main id="main" tabindex="-1">${main}</main>
        ${aside ? `<aside class="todo" aria-label="Coming up">${aside}</aside>` : ""}
      </div>
    </div>
    <button class="scrim" type="button" data-action="close-menu" aria-label="Close menu"></button>
  </div>`;
}

function exampleBanner() {
  return `<p class="example-banner">Example data for COU6508. It is not your official Canvas unit. Delete it from Settings when you are finished looking.</p>`;
}

function comingAside(events) {
  const rows = events.slice(0, 12);
  const captures = list("captures").slice(0, 4);
  return `<h2>To do / coming up</h2>
    ${rows.length ? `<ol class="coming">${rows.map((event) => {
      const overdue = new Date(event.at).getTime() < Date.now() && event.status !== "submitted" && event.status !== "graded" && event.status !== "done";
      return `<li class="${overdue ? "overdue" : ""}">
        <a href="${event.href}"><strong>${esc(event.title)}</strong><span>${esc(event.course?.code || "")}</span></a>
        <em>${esc(event.countdown)}</em>
        <small>${esc(event.when.deadline)}</small>
        ${event.when.home && event.when.deadline !== event.when.home ? `<small class="home-time">Adelaide ${esc(event.when.home)}</small>` : ""}
      </li>`;
    }).join("")}</ol>` : `<p class="muted">No dated work yet. Due dates you add on assignments show up here, in both Perth and Adelaide time.</p>`}
    <form class="capture" data-action="capture-form">
      <label for="capture-text">Quick capture</label>
      <textarea id="capture-text" name="text" rows="3" placeholder="A thought to file later"></textarea>
      <button class="btn small" type="submit">Save capture</button>
    </form>
    ${captures.length ? `<ul class="capture-list">${captures.map((cap) => `<li><p>${esc(cap.text)}</p><button type="button" class="icon-btn" data-action="delete-capture" data-id="${esc(cap.id)}" aria-label="Delete capture">${icons.trash}</button></li>`).join("")}</ul>` : ""}`;
}

function dashboard(route) {
  const rows = courses();
  const main = rows.length ? `<div class="page-head"><div><p class="kicker">Dashboard</p><h2>Your units</h2></div><button class="btn" type="button" data-action="add-course">Add a unit</button></div>
    <div class="card-grid">${rows.map((course) => {
      const progress = courseProgress(course.id);
      const next = assignmentsFor(course.id).find((row) => row.dueAt && row.status !== "graded");
      return `<a class="course-card" href="${courseHref(course.id)}">
        <span class="band" style="background:${esc(course.color)}"></span>
        <span class="code">${esc(course.code || "Unit")}</span>
        <strong>${esc(course.title)}</strong>
        ${course.example ? `<span class="pill warn">Example</span>` : ""}
        ${progressHtml(progress.done, progress.total)}
        <small>${next ? `Next due · ${esc(next.title)}` : "No open due date"}</small>
      </a>`;
    }).join("")}</div>` : `<section class="empty">
      <h2>A quiet place to study</h2>
      <p>Add a unit, or load the example COU6508 course to see modules, assignments, and a calendar before you bring your own work across.</p>
      <div class="row-actions"><button class="btn primary" type="button" data-action="load-example">Load example course</button><button class="btn" type="button" data-action="add-course">Add a unit</button></div>
    </section>`;
  return shell(route, { title: "Dashboard", main, aside: comingAside(comingUp()) });
}

function courseHome(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const progress = courseProgress(course.id);
  const next = orderedCourseItems(course.id).find((row) => !row.item.done);
  const due = assignmentsFor(course.id).slice(0, 4);
  const main = `${course.example ? exampleBanner() : ""}
    <div class="page-head"><div><p class="kicker">${esc(course.code)}</p><h2>${esc(course.title)}</h2><p class="muted">${esc(course.term || "")}</p></div>
      <div class="row-actions"><button class="btn" type="button" data-action="edit-course" data-id="${esc(course.id)}">Edit unit</button><a class="btn primary" href="${courseHref(course.id, "modules")}">Modules</a></div>
    </div>
    <section class="panel">${progressHtml(progress.done, progress.total)}<p class="muted">${progress.done} of ${progress.total} module items marked done.</p></section>
    <div class="split">
      <section class="panel"><h3>Continue</h3>${next ? `<a class="continue" href="${courseHref(course.id, "item", next.item.id)}"><span class="type-icon">${typeIcon(next.item.type)}</span><span><strong>${esc(next.item.numberLabel)} ${esc(next.item.title)}</strong><small>${esc(next.module.title)}</small></span></a>` : `<p class="muted">Everything in the modules is marked done.</p>`}</section>
      <section class="panel"><h3>Assignments</h3>${due.length ? `<ul class="plain">${due.map((row) => `<li><a href="${courseHref(course.id, "assignment", row.id)}">${esc(row.title)}</a><span class="pill">${esc(statusLabel(row.status))}</span>${row.dueAt ? `<small>${esc(countdownLabel(row.dueAt))}</small>` : ""}</li>`).join("")}</ul>` : `<p class="muted">No assignments yet.</p>`}<a href="${courseHref(course.id, "assignments")}">All assignments</a></section>
    </div>`;
  return shell(route, { title: course.code || course.title, main, course, section: "home" });
}

function modulesPage(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const modules = modulesFor(course.id);
  const focus = route.id;
  const main = `${course.example ? exampleBanner() : ""}
    <div class="page-head"><div><p class="kicker">Modules</p><h2>${esc(course.code)} modules</h2></div>
      <div class="row-actions"><button class="btn" type="button" data-action="renumber" data-course="${esc(course.id)}">Renumber</button><button class="btn primary" type="button" data-action="add-module" data-course="${esc(course.id)}">Add module</button></div>
    </div>
    ${courseProgressHtml(course.id)}
    ${modules.map((mod) => {
      const items = itemsForModule(mod.id);
      const progress = progressOf(items);
      return `<section class="module" id="module-${esc(mod.id)}">
        <header><div><p class="kicker">Module ${esc(mod.number)}</p><h3>${esc(mod.title)}</h3></div>${progressHtml(progress.done, progress.total)}
          <div class="row-actions">
            <button class="icon-btn" type="button" data-action="move" data-kind="modules" data-id="${esc(mod.id)}" data-dir="-1" aria-label="Move module up">${icons.up}</button>
            <button class="icon-btn" type="button" data-action="move" data-kind="modules" data-id="${esc(mod.id)}" data-dir="1" aria-label="Move module down">${icons.down}</button>
            <button class="btn small" type="button" data-action="add-item" data-module="${esc(mod.id)}">Add item</button>
            <button class="icon-btn" type="button" data-action="delete-module" data-id="${esc(mod.id)}" aria-label="Delete module">${icons.trash}</button>
          </div>
        </header>
        ${items.length ? `<ol class="module-items">${items.map((item) => `<li class="${focus === item.id ? "focus" : ""}">
            <button class="tick ${item.done ? "on" : ""}" type="button" data-action="toggle-done" data-id="${esc(item.id)}" aria-pressed="${item.done ? "true" : "false"}" aria-label="${item.done ? "Mark not done" : "Mark as done"}">${item.done ? icons.check : ""}</button>
            <a href="${courseHref(course.id, "item", item.id)}"><span class="type-icon">${typeIcon(item.type)}</span><span class="num">${esc(item.numberLabel)}</span><span class="item-title">${esc(item.title)}</span><span class="pill">${esc(typeLabel(item.type))}</span></a>
            <button class="icon-btn" type="button" data-action="move" data-kind="items" data-id="${esc(item.id)}" data-dir="-1" aria-label="Move up">${icons.up}</button>
            <button class="icon-btn" type="button" data-action="move" data-kind="items" data-id="${esc(item.id)}" data-dir="1" aria-label="Move down">${icons.down}</button>
          </li>`).join("")}</ol>` : `<p class="muted pad">No items in this module yet.</p>`}
      </section>`;
    }).join("") || `<section class="empty"><h2>No modules yet</h2><p>Add the first week or topic. Modules are not limited to six.</p></section>`}`;
  return shell(route, { title: "Modules", main, course, section: "modules" });
}

function courseProgressHtml(courseId) {
  const progress = courseProgress(courseId);
  return `<section class="panel slim">${progressHtml(progress.done, progress.total)}<span class="muted">${progress.done} of ${progress.total} items done in this unit</span></section>`;
}

function itemPage(route) {
  const course = courseById(route.courseId);
  const item = list("items").find((row) => row.id === route.id && row.courseId === route.courseId);
  if (!course || !item) return missing(route);
  const rows = orderedCourseItems(course.id);
  const index = rows.findIndex((row) => row.item.id === item.id);
  const prev = rows[index - 1];
  const next = rows[index + 1];
  const mod = modulesFor(course.id).find((row) => row.id === item.moduleId);
  const books = list("books");
  const main = `${course.example || item.example ? exampleBanner() : ""}
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${courseHref(course.id)}">${esc(course.code || "Unit")}</a><a href="${courseHref(course.id, "modules")}">Modules</a>${mod ? `<a href="${courseHref(course.id, "modules", mod.id)}">${esc(mod.title)}</a>` : ""}<span>${esc(item.numberLabel)}</span></nav>
    <div class="page-head">
      <div class="title-edit">
        <input class="number-input" data-collection="items" data-id="${esc(item.id)}" data-field="numberLabel" value="${esc(item.numberLabel || "")}" aria-label="Item number">
        <input class="title-input" data-collection="items" data-id="${esc(item.id)}" data-field="title" value="${esc(item.title || "")}" aria-label="Title">
      </div>
      <div class="row-actions">
        <label class="sr-only" for="item-type">Type</label>
        <select id="item-type" data-collection="items" data-id="${esc(item.id)}" data-field="type">${ITEM_TYPES.map((type) => `<option value="${type.id}" ${item.type === type.id ? "selected" : ""}>${type.label}</option>`).join("")}</select>
        <button class="btn ${item.done ? "good" : "primary"}" type="button" data-action="toggle-done" data-id="${esc(item.id)}">${item.done ? "Done" : "Mark as done"}</button>
      </div>
    </div>
    <div class="pager">
      ${prev ? `<a class="pager-link" href="${courseHref(course.id, "item", prev.item.id)}"><small>Previous</small><strong>${esc(prev.item.numberLabel)} ${esc(prev.item.title)}</strong></a>` : `<span></span>`}
      ${next ? `<a class="pager-link next" href="${courseHref(course.id, "item", next.item.id)}"><small>Next</small><strong>${esc(next.item.numberLabel)} ${esc(next.item.title)}</strong></a>` : `<span></span>`}
    </div>
    <label class="field"><span>Official Canvas link</span><input data-collection="items" data-id="${esc(item.id)}" data-field="canvasUrl" value="${esc(item.canvasUrl || "")}" placeholder="https://"></label>
    ${safeHttp(item.canvasUrl) ? `<p><a class="text-link" href="${esc(item.canvasUrl)}" target="_blank" rel="noopener noreferrer">Open in Canvas ${icons.external}</a></p>` : ""}
    ${item.type === "reading" ? readingBlock(item) : ""}
    ${item.type === "vc" ? vcBlock(item) : ""}
    ${editorBlock(item, "notes", "Notes")}
    ${editorBlock(item, "reflection", "Reflection", true)}
    <section class="panel"><h3>Tags</h3><input data-collection="items" data-id="${esc(item.id)}" data-field="tags" value="${esc((item.tags || []).join(", "))}" placeholder="racism, week 3, A1"></section>
    ${highlightsBlock(item)}
    ${attachmentsBlock(item)}
    ${qaBlock(item)}
    ${readingsListBlock(item, books)}
    ${objectivesBlock(item)}
    ${legacyBlock(item)}
    <p class="row-actions"><button class="btn danger" type="button" data-action="delete-item" data-id="${esc(item.id)}">Delete item</button></p>`;
  return shell(route, { title: item.title || "Item", main, course, section: "modules" });
}

function editorBlock(item, field, label, count = false) {
  const id = `${field}-${item.id}`;
  return `<section class="panel"><div class="panel-head"><h3>${label}</h3>${count ? `<span id="word-count">${wordCount(item[field])} words</span>` : ""}</div>
    <div class="format-bar">
      <button type="button" data-action="format" data-cmd="bold" data-target="${id}"><b>B</b></button>
      <button type="button" data-action="format" data-cmd="italic" data-target="${id}"><i>I</i></button>
      <button type="button" data-action="format" data-cmd="insertUnorderedList" data-target="${id}">List</button>
      <button type="button" data-action="format" data-cmd="hilite" data-target="${id}">Highlight</button>
      <button type="button" data-action="format" data-cmd="link" data-target="${id}">Link</button>
    </div>
    <div id="${id}" class="editor" contenteditable="true" role="textbox" aria-label="${label}" data-collection="items" data-id="${esc(item.id)}" data-field="${field}" data-multiline="true">${sanitizeHtml(item[field] || "")}</div>
  </section>`;
}

function readingBlock(item) {
  return `<section class="panel"><h3>Reading details</h3>
    <label class="field"><span>APA 7 reference</span><textarea data-collection="items" data-id="${esc(item.id)}" data-field="apaReference" rows="3">${esc(item.apaReference || "")}</textarea></label>
    <label class="field"><span>PDF or web link</span><input data-collection="items" data-id="${esc(item.id)}" data-field="url" value="${esc(item.url || "")}" placeholder="https://"></label>
    ${safeHttp(item.url) ? `<p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open reading</a></p>` : ""}
  </section>`;
}

function vcBlock(item) {
  const slides = item.slides || [];
  return `<section class="panel"><h3>Virtual class</h3>
    <label class="field"><span>Recording link</span><input data-collection="items" data-id="${esc(item.id)}" data-field="recordingUrl" value="${esc(item.recordingUrl || "")}" placeholder="https://"></label>
    ${safeHttp(item.recordingUrl) ? `<p><a href="${esc(item.recordingUrl)}" target="_blank" rel="noopener noreferrer">Open recording</a></p>` : ""}
    <label class="field"><span>Transcript</span><textarea data-collection="items" data-id="${esc(item.id)}" data-field="transcript" rows="5">${esc(item.transcript || "")}</textarea></label>
    <h4>Slides</h4>
    ${slides.map((slide, index) => `<div class="slide-edit"><input data-collection="items" data-id="${esc(item.id)}" data-nested="slides" data-row="${esc(slide.id)}" data-field="title" value="${esc(slide.title || "")}" aria-label="Slide ${index + 1} title"><textarea data-collection="items" data-id="${esc(item.id)}" data-nested="slides" data-row="${esc(slide.id)}" data-field="body" rows="3" aria-label="Slide ${index + 1} notes">${esc(slide.body || "")}</textarea></div>`).join("")}
    <button class="btn small" type="button" data-action="add-slide" data-id="${esc(item.id)}">Add slide</button>
  </section>`;
}

function highlightsBlock(item) {
  const rows = item.highlights || [];
  return `<section class="panel"><h3>Highlights</h3>${rows.length ? `<ul class="highlights">${rows.map((row) => `<li><mark>${esc(row.text)}</mark><button type="button" data-action="delete-highlight" data-id="${esc(item.id)}" data-row="${esc(row.id)}">Remove</button></li>`).join("")}</ul>` : `<p class="muted">Select text in your notes and press Highlight. Those lines can become revision cards.</p>`}</section>`;
}

function attachmentsBlock(item) {
  const rows = item.attachments || [];
  return `<section class="panel"><h3>Attachments</h3>
    ${rows.map((row) => {
      const src = row.blobId ? blobSrc(row.blobId) : "";
      const link = safeHttp(row.url) ? `<a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">${esc(row.name || row.url)}</a>` : `<span>${esc(row.name || "Image")}</span>`;
      return `<p class="attach">${src ? `<img alt="${esc(row.name || "Attachment")}" src="${src}">` : ""}${link}${row.localOnly ? `<small>Stays on this device</small>` : ""}<button type="button" data-action="delete-attachment" data-id="${esc(item.id)}" data-row="${esc(row.id)}">Remove</button></p>`;
    }).join("")}
    <div class="row-actions"><button class="btn small" type="button" data-action="add-link" data-id="${esc(item.id)}">Add link</button><button class="btn small" type="button" data-action="add-image" data-id="${esc(item.id)}">Add image</button></div>
    <input class="sr-only" id="image-picker" type="file" accept="image/*" data-action="pick-image" data-id="${esc(item.id)}">
  </section>`;
}

function qaBlock(item) {
  const rows = item.qa || [];
  return `<section class="panel"><h3>Questions for revision</h3>
    ${rows.map((row) => `<div class="qa"><input data-collection="items" data-id="${esc(item.id)}" data-nested="qa" data-row="${esc(row.id)}" data-field="question" value="${esc(row.question || "")}" placeholder="Question"><textarea data-collection="items" data-id="${esc(item.id)}" data-nested="qa" data-row="${esc(row.id)}" data-field="answer" rows="3" placeholder="Answer">${esc(row.answer || "")}</textarea><button type="button" class="icon-btn" data-action="delete-nested" data-id="${esc(item.id)}" data-nested="qa" data-row="${esc(row.id)}" aria-label="Remove question">${icons.trash}</button></div>`).join("")}
    <button class="btn small" type="button" data-action="add-qa" data-id="${esc(item.id)}">Add question</button>
  </section>`;
}

function readingsListBlock(item, books) {
  const options = [`<option value="">No chapter link</option>`].concat(books.filter((book) => !book.deleted).flatMap((book) => (book.chapters || []).map((chapter) => `<option value="${esc(chapter.id)}">${esc(book.title)} — ${esc(chapter.title || "Chapter")}</option>`)));
  return `<section class="panel"><h3>Reading list</h3>
    ${(item.readings || []).map((reading) => `<div class="reading-row"><input type="checkbox" data-collection="items" data-id="${esc(item.id)}" data-nested="readings" data-row="${esc(reading.id)}" data-field="done" ${reading.done ? "checked" : ""} aria-label="Reading done"><input data-collection="items" data-id="${esc(item.id)}" data-nested="readings" data-row="${esc(reading.id)}" data-field="text" value="${esc(reading.text || "")}" placeholder="APA reference or chapter"><select data-collection="items" data-id="${esc(item.id)}" data-nested="readings" data-row="${esc(reading.id)}" data-field="chapterId">${options.join("").replace(`value="${esc(reading.chapterId || "")}"`, `value="${esc(reading.chapterId || "")}" selected`)}</select><button type="button" class="icon-btn" data-action="delete-nested" data-id="${esc(item.id)}" data-nested="readings" data-row="${esc(reading.id)}" aria-label="Remove reading">${icons.trash}</button></div>`).join("")}
    <button class="btn small" type="button" data-action="add-reading" data-id="${esc(item.id)}">Add reading</button>
  </section>`;
}

function objectivesBlock(item) {
  if (!(item.objectives || []).length && !item.sourceText) return "";
  return `<section class="panel"><h3>Objectives and source text</h3>
    ${(item.objectives || []).map((row) => `<div class="reading-row"><span class="swatch" style="background:${esc(row.color || "#F5D98B")}"></span><input data-collection="items" data-id="${esc(item.id)}" data-nested="objectives" data-row="${esc(row.id)}" data-field="text" value="${esc(row.text || "")}"><button type="button" class="icon-btn" data-action="delete-nested" data-id="${esc(item.id)}" data-nested="objectives" data-row="${esc(row.id)}" aria-label="Remove objective">${icons.trash}</button></div>`).join("")}
    <button class="btn small" type="button" data-action="add-objective" data-id="${esc(item.id)}">Add objective</button>
    <label class="field"><span>Source pages</span></label>
    <div class="editor" contenteditable="true" data-collection="items" data-id="${esc(item.id)}" data-field="sourceText" data-multiline="true">${sanitizeHtml(item.sourceText || "")}</div>
    <label class="field"><span>Page range</span><input data-collection="items" data-id="${esc(item.id)}" data-field="sourceRange" value="${esc(item.sourceRange || "")}"></label>
  </section>`;
}

function legacyBlock(item) {
  const bits = [];
  if ((item.footnotes || []).length) bits.push(`<h4>Footnotes</h4><ul>${item.footnotes.map((row) => `<li>${esc(row.text || "")}</li>`).join("")}</ul>`);
  if ((item.comments || []).length) bits.push(`<h4>Comments</h4><ul>${item.comments.map((row) => `<li>${esc(row.text || "")}</li>`).join("")}</ul>`);
  if ((item.slideshows || []).length) bits.push(`<h4>Imported slideshows</h4><ul>${item.slideshows.map((deck) => `<li>${esc(deck.name || "Slideshow")} (${(deck.slides || []).length} slides)</li>`).join("")}</ul>`);
  if ((item.hotspotActivities || []).length) bits.push(`<h4>Imported activities</h4>${item.hotspotActivities.map((activity) => `<p>${esc(activity.name || "Activity")}</p>${activity.imageDataUrl?.blobId ? blobImage(activity.imageDataUrl.blobId) : ""}${activity.imageDataUrl && typeof activity.imageDataUrl === "string" ? `<img alt="" src="${activity.imageDataUrl}">` : ""}<ul>${(activity.hotspots || []).map((spot) => `<li>${esc(spot.label || "")} ${esc(spot.info || "")}</li>`).join("")}</ul>`).join("")}`);
  if (item.assessment) bits.push(`<p>Assessment tag: <strong>${esc(item.assessment)}</strong></p>`);
  if (!bits.length) return "";
  return `<details class="panel"><summary>Imported details from version 1</summary>${bits.join("")}</details>`;
}

function blobSrc(id) {
  const blob = (store.data.blobs || []).find((row) => row.id === id && !row.deleted);
  return blob?.dataUrl || "";
}

function blobImage(id) {
  const src = blobSrc(id);
  return src ? `<img alt="Imported image" src="${src}">` : "";
}

function safeHttp(url) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

function assignmentsPage(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const rows = assignmentsFor(course.id);
  const main = `${course.example ? exampleBanner() : ""}
    <div class="page-head"><div><p class="kicker">Assignments</p><h2>${esc(course.code)}</h2></div><button class="btn primary" type="button" data-action="add-assignment" data-course="${esc(course.id)}">Add assignment</button></div>
    ${rows.length ? `<div class="table-wrap"><table class="grid"><thead><tr><th>Assignment</th><th>Due</th><th>Weight</th><th>Status</th><th>Turnitin</th><th>Mark</th></tr></thead><tbody>${rows.map((row) => {
      const when = row.dueAt ? formatDual(row.dueAt, row.timezone || "Australia/Perth") : null;
      return `<tr><td><a href="${courseHref(course.id, "assignment", row.id)}">${esc(row.title)}</a></td><td>${when ? `${esc(when.deadline)}<br><small>Adelaide ${esc(when.home)}</small>` : "—"}</td><td>${row.weighting ?? "—"}%</td><td><span class="pill status-${esc(row.status)}">${esc(statusLabel(row.status))}</span></td><td>${row.turnitin ?? "—"}%</td><td>${row.mark == null ? "—" : `${esc(row.mark)} / ${esc(row.markOutOf ?? "")}`}</td></tr>`;
    }).join("")}</tbody></table></div>` : `<section class="empty"><h2>No assignments yet</h2><p>Add the assessment name, the Perth deadline, and the weighting from the unit outline.</p></section>`}`;
  return shell(route, { title: "Assignments", main, course, section: "assignments" });
}

function assignmentPage(route) {
  const course = courseById(route.courseId);
  const row = list("assignments").find((item) => item.id === route.id);
  if (!course || !row) return missing(route);
  const zone = row.timezone || "Australia/Perth";
  const parts = row.dueAt ? inputParts(row.dueAt, zone) : { date: "", time: "" };
  const when = row.dueAt ? formatDual(row.dueAt, zone) : null;
  const items = orderedCourseItems(course.id);
  const rubric = row.rubric || { columns: ["Needs work", "Developing", "Accomplished"], rows: [] };
  const main = `${course.example ? exampleBanner() : ""}
    <nav class="crumbs"><a href="${courseHref(course.id, "assignments")}">Assignments</a><span>${esc(row.title)}</span></nav>
    <div class="page-head"><input class="title-input" data-collection="assignments" data-id="${esc(row.id)}" data-field="title" value="${esc(row.title || "")}" aria-label="Assignment title"></div>
    <div class="due-box" data-due-for="${esc(row.id)}">
      <label>Due date<input type="date" data-due-part="date" data-id="${esc(row.id)}" value="${esc(parts.date)}"></label>
      <label>Time<input type="time" data-due-part="time" data-id="${esc(row.id)}" value="${esc(parts.time)}"></label>
      <label>Deadline timezone<select data-due-part="zone" data-id="${esc(row.id)}"><option value="Australia/Perth" ${zone === "Australia/Perth" ? "selected" : ""}>Perth (ECU)</option><option value="Australia/Adelaide" ${zone === "Australia/Adelaide" ? "selected" : ""}>Adelaide</option><option value="Australia/Sydney" ${zone === "Australia/Sydney" ? "selected" : ""}>Sydney</option></select></label>
      <p id="due-preview">${when ? `<strong>${esc(when.deadline)}</strong><br>Adelaide: ${esc(when.home)}` : "Add a date to see both clocks."}</p>
    </div>
    <div class="form-grid">
      <label class="field"><span>Weighting %</span><input type="number" min="0" max="100" step="0.1" data-collection="assignments" data-id="${esc(row.id)}" data-field="weighting" value="${esc(row.weighting ?? "")}"></label>
      <label class="field"><span>Word count target</span><input type="number" min="0" step="1" data-collection="assignments" data-id="${esc(row.id)}" data-field="wordCount" value="${esc(row.wordCount ?? "")}"></label>
      <label class="field"><span>Status</span><select data-collection="assignments" data-id="${esc(row.id)}" data-field="status">${ASSIGNMENT_STATUSES.map((status) => `<option value="${status.id}" ${row.status === status.id ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
      <label class="field"><span>Submitted</span><input type="datetime-local" data-collection="assignments" data-id="${esc(row.id)}" data-field="submittedAt" value="${esc(localInput(row.submittedAt))}"></label>
      <label class="field"><span>Turnitin %</span><input type="number" min="0" max="100" step="1" data-collection="assignments" data-id="${esc(row.id)}" data-field="turnitin" value="${esc(row.turnitin ?? "")}"></label>
      <label class="field"><span>Mark</span><input type="number" step="0.1" data-collection="assignments" data-id="${esc(row.id)}" data-field="mark" value="${esc(row.mark ?? "")}"></label>
      <label class="field"><span>Out of</span><input type="number" step="0.1" data-collection="assignments" data-id="${esc(row.id)}" data-field="markOutOf" value="${esc(row.markOutOf ?? "")}"></label>
    </div>
    <label class="field"><span>Feedback</span><textarea data-collection="assignments" data-id="${esc(row.id)}" data-field="feedback" rows="4">${esc(row.feedback || "")}</textarea></label>
    <label class="field"><span>Notes</span><textarea data-collection="assignments" data-id="${esc(row.id)}" data-field="notes" rows="3">${esc(row.notes || "")}</textarea></label>
    <section class="panel"><div class="panel-head"><h3>Rubric</h3><button class="btn small" type="button" data-action="paste-rubric" data-id="${esc(row.id)}">Paste table</button></div>
      <div class="table-wrap"><table class="grid rubric"><thead><tr><th>Criterion</th>${(rubric.columns || []).map((col, index) => `<th><input data-rubric="column" data-id="${esc(row.id)}" data-col="${index}" value="${esc(col)}" aria-label="Level ${index + 1}"></th>`).join("")}</tr></thead>
      <tbody>${(rubric.rows || []).map((line) => `<tr><th><input data-rubric="criterion" data-id="${esc(row.id)}" data-row="${esc(line.id)}" value="${esc(line.criterion || "")}"></th>${(rubric.columns || []).map((col, index) => `<td><textarea data-rubric="cell" data-id="${esc(row.id)}" data-row="${esc(line.id)}" data-col="${index}" rows="3">${esc(line.cells?.[index] || "")}</textarea></td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="row-actions"><button class="btn small" type="button" data-action="add-criterion" data-id="${esc(row.id)}">Add criterion</button><button class="btn small" type="button" data-action="add-level" data-id="${esc(row.id)}">Add level</button></div>
    </section>
    <section class="panel"><h3>Linked module items</h3>${items.map(({ item }) => `<label class="check"><input type="checkbox" data-action="link-item" data-id="${esc(row.id)}" data-item="${esc(item.id)}" ${(row.linkedItemIds || []).includes(item.id) ? "checked" : ""}> ${esc(item.numberLabel)} ${esc(item.title)}</label>`).join("") || `<p class="muted">Add module items first.</p>`}</section>
    <button class="btn danger" type="button" data-action="delete-assignment" data-id="${esc(row.id)}">Delete assignment</button>`;
  return shell(route, { title: row.title || "Assignment", main, course, section: "assignments" });
}

function inputParts(iso, zone) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const bag = Object.fromEntries(fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  let hour = bag.hour === "24" ? "00" : bag.hour;
  return { date: `${bag.year}-${bag.month}-${bag.day}`, time: `${hour}:${bag.minute}` };
}

function localInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calendarPage(route, course) {
  const month = parseMonth(route.query.m || currentMonthKey());
  const events = calendarEvents({ courseId: course?.id || null });
  const inMonth = events.filter((event) => event.day.startsWith(month.key));
  const selected = route.query.d || "";
  const shown = selected ? inMonth.filter((event) => event.day === selected) : inMonth;
  const byDay = new Map();
  for (const event of inMonth) {
    if (!byDay.has(event.day)) byDay.set(event.day, []);
    byDay.get(event.day).push(event);
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: HOME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const prev = shiftMonth(month.year, month.month, -1);
  const next = shiftMonth(month.year, month.month, 1);
  const hrefFor = (y, m, day = "") => {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const base = course ? courseHref(course.id, "calendar") : "#/calendar";
    const params = new URLSearchParams({ m: key });
    if (day) params.set("d", day);
    return `${base}?${params}`;
  };
  const cells = monthGrid(month.year, month.month).map((day) => {
    if (!day) return `<div class="cal-cell empty"></div>`;
    const listItems = byDay.get(day) || [];
    return `<a class="cal-cell ${day === today ? "today" : ""} ${day === selected ? "selected" : ""}" href="${hrefFor(month.year, month.month, day)}"><span>${Number(day.slice(-2))}</span>${listItems.slice(0, 3).map((event) => `<em class="dot ${event.kind}">${esc(event.title)}</em>`).join("")}</a>`;
  }).join("");
  const main = `<div class="page-head"><div><p class="kicker">${course ? esc(course.code) : "All units"}</p><h2>${esc(monthLabel(month.year, month.month))}</h2><p class="muted">Assignment dates use the deadline timezone. Your home clock is ${esc(zoneAbbrev(new Date().toISOString(), HOME_ZONE))}.</p></div>
    <div class="row-actions"><a class="btn" href="${hrefFor(prev.year, prev.month)}">Previous</a><a class="btn" href="${hrefFor(next.year, next.month)}">Next</a></div></div>
    <div class="cal-layout"><div><div class="cal-weekdays">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}</div><div class="cal-grid">${cells}</div></div>
    <section class="agenda"><h3>${selected ? esc(selected) : "This month"}</h3>${shown.length ? shown.map((event) => `<a class="agenda-item" href="${event.href}"><strong>${esc(event.title)}</strong><span>${esc(event.when.deadline)}</span><small>Adelaide ${esc(event.when.home)} · ${esc(event.countdown)}</small></a>`).join("") : `<p class="muted">Nothing dated here.</p>`}</section></div>`;
  return shell(route, { title: "Calendar", main, course, section: "calendar", aside: course ? "" : comingAside(comingUp()) });
}

function filesPage(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const readings = list("items").filter((item) => item.courseId === course.id && (item.type === "reading" || (item.readings || []).length || item.apaReference));
  const files = list("items").filter((item) => item.courseId === course.id).flatMap((item) => (item.attachments || []).map((file) => ({ ...file, item })));
  const books = list("books").filter((book) => !book.courseId || book.courseId === course.id);
  const main = `<div class="page-head"><div><p class="kicker">Readings / files</p><h2>${esc(course.code)}</h2></div><button class="btn" type="button" data-action="add-book" data-course="${esc(course.id)}">Add a book</button></div>
    <section class="panel"><h3>Readings</h3>${readings.map((item) => `<p><a href="${courseHref(course.id, "item", item.id)}">${esc(item.numberLabel)} ${esc(item.title)}</a></p><p class="muted">${esc(item.apaReference || (item.readings || []).map((r) => r.text).join(" · "))}</p>`).join("") || `<p class="muted">No readings yet.</p>`}</section>
    <section class="panel"><h3>Files and links</h3>${files.map((file) => `<p>${safeHttp(file.url) ? `<a href="${esc(file.url)}" target="_blank" rel="noopener noreferrer">${esc(file.name || file.url)}</a>` : esc(file.name || "Image")} <small>on ${esc(file.item.numberLabel || file.item.title)}</small></p>`).join("") || `<p class="muted">Links and images you attach to items show up here.</p>`}</section>
    <section class="panel"><h3>Library</h3>${books.map((book) => `<article class="book"><a href="#/library/${esc(book.id)}"><strong>${esc(book.title)}</strong></a><p class="muted">${esc(book.author || "")}</p><ul>${(book.chapters || []).map((chapter) => `<li><a href="#/library/${esc(book.id)}/${esc(chapter.id)}">${esc(chapter.title || "Chapter")}</a></li>`).join("")}</ul></article>`).join("") || `<p class="muted">Books imported from version 1, and books you add, live here.</p>`}</section>`;
  return shell(route, { title: "Readings", main, course, section: "files" });
}

function gradesPage(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const rows = assignmentsFor(course.id);
  const grade = weightedGrade(rows);
  const main = `<div class="page-head"><div><p class="kicker">Grades</p><h2>${esc(course.code)}</h2></div></div>
    <section class="grade-hero"><p class="kicker">Running grade</p><strong>${grade.soFar == null ? "—" : `${grade.soFar.toFixed(1)}%`}</strong><p>${grade.soFar == null ? "No marked work yet. Enter a mark on an assignment and set its status to Graded." : `Across the ${grade.weightCounted}% of the unit that has a mark. That is ${grade.earned.toFixed(1)} points toward 100.`}</p><p class="muted">Weight entered so far: ${grade.totalWeight}%.</p></section>
    <div class="table-wrap"><table class="grid"><thead><tr><th>Assignment</th><th>Weight</th><th>Mark</th><th>Contribution</th></tr></thead><tbody>${rows.map((row) => {
      const contribution = row.status === "graded" && Number(row.markOutOf) > 0 && Number(row.weighting) > 0 ? ((Number(row.mark) / Number(row.markOutOf)) * Number(row.weighting)) : null;
      return `<tr><td><a href="${courseHref(course.id, "assignment", row.id)}">${esc(row.title)}</a></td><td>${row.weighting ?? "—"}%</td><td>${row.mark == null ? "—" : `${esc(row.mark)} / ${esc(row.markOutOf)}`}</td><td>${contribution == null ? "—" : contribution.toFixed(1)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  return shell(route, { title: "Grades", main, course, section: "grades" });
}

function journalPage(route) {
  const course = courseById(route.courseId);
  if (!course) return missing(route);
  const entries = list("journal").filter((entry) => entry.courseId === course.id).sort(byPosition);
  const reflections = list("items").filter((item) => item.courseId === course.id && (item.type === "journal" || String(item.reflection || "").replace(/<[^>]+>/g, "").trim()));
  const open = entries.find((entry) => entry.id === route.id);
  const main = `<div class="page-head"><div><p class="kicker">Notes / journal</p><h2>${esc(course.code)}</h2></div><button class="btn primary" type="button" data-action="add-journal" data-course="${esc(course.id)}">New entry</button></div>
    ${open ? `<section class="panel"><input class="title-input" data-collection="journal" data-id="${esc(open.id)}" data-field="title" value="${esc(open.title || "")}" aria-label="Entry title"><label class="field"><span>Date</span><input type="date" data-collection="journal" data-id="${esc(open.id)}" data-field="date" value="${esc(open.date || "")}"></label><div class="editor" contenteditable="true" data-collection="journal" data-id="${esc(open.id)}" data-field="body" data-multiline="true">${sanitizeHtml(open.body || "")}</div><button class="btn danger" type="button" data-action="delete-journal" data-id="${esc(open.id)}">Delete entry</button></section>` : ""}
    <section class="panel"><h3>Journal entries</h3><ul class="plain">${entries.map((entry) => `<li><a href="${courseHref(course.id, "journal", entry.id)}">${esc(entry.title || "Untitled")}</a><small>${esc(entry.date || "")}</small></li>`).join("") || `<li class="muted">No journal entries yet.</li>`}</ul></section>
    <section class="panel"><h3>Reflections on module items</h3><ul class="plain">${reflections.map((item) => `<li><a href="${courseHref(course.id, "item", item.id)}">${esc(item.numberLabel)} ${esc(item.title)}</a></li>`).join("") || `<li class="muted">Reflections you write on items will be listed here.</li>`}</ul></section>`;
  return shell(route, { title: "Journal", main, course, section: "journal" });
}

function revisionPage(route) {
  const now = Date.now();
  const due = list("cards").filter((card) => isDue(card, now)).sort((a, b) => a.due - b.due);
  const card = due[0];
  const summary = weekSummary(now);
  const later = list("cards").filter((cardRow) => !cardRow.deleted && cardRow.due > now).sort((a, b) => a.due - b.due)[0];
  const main = `<div class="page-head"><div><p class="kicker">Revision</p><h2>Review queue</h2><p class="muted">${due.length} card${due.length === 1 ? "" : "s"} due</p></div><button class="btn" type="button" data-action="build-cards">Build cards from highlights and Q&amp;A</button></div>
    ${card ? `<article class="flash" data-card="${esc(card.id)}"><p class="kicker">${esc(courseById(card.courseId)?.code || "Card")}</p><h3>${esc(card.front)}</h3><p class="flash-back" hidden>${esc(card.back)}</p><div class="row-actions"><button class="btn" type="button" data-action="reveal">Show answer</button><button class="btn" type="button" data-action="rate" data-rating="again" data-id="${esc(card.id)}">Again</button><button class="btn" type="button" data-action="rate" data-rating="hard" data-id="${esc(card.id)}">Hard</button><button class="btn primary" type="button" data-action="rate" data-rating="good" data-id="${esc(card.id)}">Good</button><button class="btn good" type="button" data-action="rate" data-rating="easy" data-id="${esc(card.id)}">Easy</button></div></article>` : `<section class="empty"><h2>Nothing due right now</h2><p>${later ? `Next card is due ${esc(formatWhen(new Date(later.due).toISOString(), HOME_ZONE))}.` : "Build cards from your highlights and question boxes, then rate them Again, Hard, Good, or Easy."}</p></section>`}
    <section class="panel"><h3>This week · ${esc(summary.bounds.startKey)} to ${esc(summary.bounds.endKey)}</h3>
      <p>${summary.doneItems.length} module item${summary.doneItems.length === 1 ? "" : "s"} marked done.</p>
      <ul class="plain">${summary.doneItems.map((item) => `<li><a href="${courseHref(item.courseId, "item", item.id)}">${esc(item.numberLabel)} ${esc(item.title)}</a></li>`).join("")}</ul>
      <p>${summary.due.length} dated thing${summary.due.length === 1 ? "" : "s"} this week. ${summary.reviews.length} card review${summary.reviews.length === 1 ? "" : "s"}.</p>
      <ul class="plain">${summary.due.map((event) => `<li><a href="${event.href}">${esc(event.title)}</a> <small>${esc(event.countdown)}</small></li>`).join("")}</ul>
    </section>`;
  return shell(route, { title: "Revision", main });
}

function searchPage(route) {
  const query = route.query.q || "";
  const hits = query ? searchAll(query, searchData()) : [];
  const main = `<div class="page-head"><div><p class="kicker">Search</p><h2>${query ? esc(query) : "Search everything"}</h2></div></div>
    ${query ? `<p class="muted">${hits.length} result${hits.length === 1 ? "" : "s"}</p><ul class="results">${hits.map((hit) => `<li><a href="${hit.href}"><span class="pill">${esc(hit.kind)}</span><strong>${esc(hit.title)}</strong><small>${esc(hit.path)}</small></a></li>`).join("") || `<li class="muted">Nothing matched.</li>`}</ul>` : `<p class="muted">Search notes, readings, assignments, books, and journal entries.</p>`}`;
  return shell(route, { title: "Search", main });
}

function settingsPage(route) {
  const backups = store.backups;
  const conflicts = store.conflicts;
  const main = `<div class="page-head"><div><p class="kicker">Settings</p><h2>This device and the cloud</h2></div></div>
    <section class="panel"><h3>Sign in</h3><p>Study Hub works fully on this device if you never sign in. Sign in with Google to keep a private copy under your account. Only that account can read it. Version 1’s shared Firebase path is left alone.</p><p><a href="SETUP.md">Step-by-step Firebase setup</a></p><button class="btn primary" type="button" id="account-btn-2" data-action="sign-in">Sign in with Google</button></section>
    <section class="panel"><h3>Example unit</h3><p>Load a pretend COU6508 unit so you can click around. It is marked example and can be removed without touching your real units.</p><div class="row-actions"><button class="btn" type="button" data-action="load-example">Load example course</button><button class="btn danger" type="button" data-action="delete-example">Delete example data</button></div></section>
    <section class="panel"><h3>Backup</h3><p>A snapshot is kept on this device once a day, for 14 days. You can also download a JSON file.</p><div class="row-actions"><button class="btn" type="button" data-action="export-json">Download JSON</button><button class="btn" type="button" data-action="import-json">Import JSON</button></div><input id="import-file" class="sr-only" type="file" accept="application/json,.json"><p class="muted">Import merges by default. Replacing everything asks you to confirm.</p>
      <h4>Bring version 1 across</h4><p>If you have used the original study tool in this browser, its data is still on this device. You can also import a JSON file you exported from version 1. <a href="sample/v1-export.json">Sample version 1 file</a></p><button class="btn" type="button" data-action="import-v1">Import from version 1 on this device</button>
      <ul class="plain">${backups.map((backup) => `<li><span>${esc(backup.id)}</span> <button class="btn small" type="button" data-action="restore-backup" data-id="${esc(backup.id)}">Restore</button></li>`).join("") || `<li class="muted">No daily snapshot yet. One is saved the first time you open Study Hub each day.</li>`}</ul>
    </section>
    <section class="panel"><h3>Sync conflicts</h3>${conflicts.length ? conflicts.map((conflict) => `<article class="conflict"><p><strong>${esc(conflict.title || conflict.recordId)}</strong> was changed on two devices.</p><div class="row-actions"><button class="btn small" type="button" data-action="keep-conflict" data-which="local" data-id="${esc(conflict.id)}">Keep this device</button><button class="btn small" type="button" data-action="keep-conflict" data-which="remote" data-id="${esc(conflict.id)}">Keep the cloud copy</button></div></article>`).join("") : `<p class="muted">No conflicts. If you edit the same item on two devices while offline, both copies are kept and you choose here.</p>`}</section>`;
  return shell(route, { title: "Settings", main });
}

function libraryPage(route) {
  const book = list("books").find((row) => row.id === route.bookId);
  if (!book) return shell(route, { title: "Library", main: `<section class="empty"><h2>That book is not on this device.</h2></section>` });
  const chapter = (book.chapters || []).find((row) => row.id === route.chapterId) || null;
  const main = `<nav class="crumbs"><a href="${book.courseId ? courseHref(book.courseId, "files") : "#/dashboard"}">Library</a><span>${esc(book.title)}</span></nav>
    <div class="page-head"><div><p class="kicker">${esc(book.author || "Book")}</p><h2>${esc(book.title)}</h2><p class="muted">${esc(book.fullReference || "")}</p></div></div>
    ${chapter ? `<section class="panel"><h3>${esc(chapter.title || "Chapter")}</h3><p class="muted">${esc((chapter.tags || []).join(", "))}</p><div class="editor" contenteditable="true" data-book="${esc(book.id)}" data-chapter="${esc(chapter.id)}" data-field="notes" data-multiline="true">${sanitizeHtml(chapter.notes || "")}</div><label class="field"><span>Source pages</span><textarea data-book="${esc(book.id)}" data-chapter="${esc(chapter.id)}" data-field="sourceText" rows="4">${esc(chapter.sourceText || "")}</textarea></label><p class="muted">${esc(chapter.sourceRange || "")}</p></section>` : `<ul class="plain">${(book.chapters || []).map((row) => `<li><a href="#/library/${esc(book.id)}/${esc(row.id)}">${esc(row.title || "Chapter")}</a></li>`).join("")}</ul>`}
    <p><button class="btn" type="button" data-action="add-chapter" data-id="${esc(book.id)}">Add chapter</button> <button class="btn danger" type="button" data-action="delete-book" data-id="${esc(book.id)}">Delete book</button></p>`;
  const course = book.courseId ? courseById(book.courseId) : null;
  return shell(route, { title: book.title, main, course, section: "files" });
}

function missing(route) {
  return shell(route, { title: "Not found", main: `<section class="empty"><h2>That page is not on this device.</h2><p><a href="#/dashboard">Back to the dashboard</a></p></section>` });
}

export function renderRoute(route) {
  if (route.name === "dashboard") return dashboard(route);
  if (route.name === "calendar") return calendarPage(route, null);
  if (route.name === "revision") return revisionPage(route);
  if (route.name === "search") return searchPage(route);
  if (route.name === "settings") return settingsPage(route);
  if (route.name === "library") return libraryPage(route);
  if (route.name === "course") {
    if (route.section === "modules") return modulesPage(route);
    if (route.section === "item") return itemPage(route);
    if (route.section === "assignments") return assignmentsPage(route);
    if (route.section === "assignment") return assignmentPage(route);
    if (route.section === "calendar") return calendarPage(route, courseById(route.courseId));
    if (route.section === "files") return filesPage(route);
    if (route.section === "grades") return gradesPage(route);
    if (route.section === "journal") return journalPage(route);
    return courseHome(route);
  }
  return dashboard(route);
}

export function searchData() {
  return {
    courses: list("courses"),
    modules: list("modules"),
    items: list("items"),
    assignments: list("assignments"),
    books: list("books"),
    journal: list("journal"),
    captures: list("captures")
  };
}
