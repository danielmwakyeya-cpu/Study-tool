import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatDual, zonedTimeToUtc } from "../js/dates.js";
import { weightedGrade } from "../js/grades.js";
import { mergeById } from "../js/merge.js";
import { isV1Export, migrateV1 } from "../js/migrate.js";
import { searchAll } from "../js/search.js";
import { exampleCourseRecords } from "../js/seed.js";
import { blankSchedule, reviewCard } from "../js/srs.js";

const sample = JSON.parse(readFileSync(new URL("../sample/v1-export.json", import.meta.url), "utf8"));

test("Perth wall time becomes the right UTC instant", () => {
  assert.equal(zonedTimeToUtc("2026-11-13", "14:00", "Australia/Perth"), "2026-11-13T06:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-12-07", "23:59", "Australia/Perth"), "2026-12-07T15:59:00.000Z");
  const dual = formatDual("2026-11-13T06:00:00.000Z", "Australia/Perth");
  assert.match(dual.deadline, /2:00 pm/i);
  assert.match(dual.deadline, /AWST/);
  assert.match(dual.home, /4:30 pm/i);
  assert.match(dual.home, /ACDT/);
});

test("weighted grade counts only graded work", () => {
  const grade = weightedGrade([
    { weighting: 40, mark: 30, markOutOf: 40, status: "graded" },
    { weighting: 60, mark: 50, markOutOf: 100, status: "submitted" }
  ]);
  assert.equal(grade.earned, 30);
  assert.equal(grade.weightCounted, 40);
  assert.equal(grade.totalWeight, 100);
  assert.equal(grade.soFar, 75);
  assert.equal(weightedGrade([{ status: "submitted", weighting: 40 }]).soFar, null);
});

test("spaced repetition moves the next due time", () => {
  const now = Date.parse("2026-11-13T00:00:00Z");
  const first = reviewCard(blankSchedule(now), "good", now);
  assert.equal(first.reps, 1);
  assert.equal(first.intervalDays, 1);
  assert.equal(first.due, now + 86400000);
  const again = reviewCard(first, "again", now);
  assert.equal(again.reps, 0);
  assert.equal(again.due, now + 10 * 60 * 1000);
});

test("example course matches the COU6508 brief", () => {
  const pack = exampleCourseRecords();
  const course = pack.courses[0];
  assert.equal(course.code, "COU6508");
  assert.equal(course.example, true);
  assert.deepEqual(pack.modules.map((mod) => mod.number), [1, 2, 3]);
  const titles = pack.items.map((item) => item.title);
  assert.ok(titles.includes("Social system barriers journal reflection"));
  const reading = pack.items.find((item) => item.numberLabel === "3.2");
  assert.equal(reading.type, "reading");
  assert.match(reading.readings.map((row) => row.text).join(" "), /Berman/);
  assert.match(reading.readings.map((row) => row.text).join(" "), /Paradies, Y\. \(2006\)/);
  const a1 = pack.assignments.find((row) => row.title === "A1 Photoyarn");
  assert.equal(a1.weighting, 40);
  assert.equal(a1.status, "submitted");
  assert.equal(a1.turnitin, 11);
  assert.equal(a1.dueAt, "2026-11-13T06:00:00.000Z");
  const a2 = pack.assignments.find((row) => row.title === "A2");
  assert.equal(a2.dueAt, "2026-12-07T15:59:00.000Z");
  assert.ok(pack.cards.length >= 3);
});

test("version 1 export maps without dropping fields", () => {
  assert.equal(isV1Export(sample), true);
  const out = migrateV1(sample, { now: 1800000000000 });
  assert.equal(out.courses.length, 1);
  assert.equal(out.courses[0].code, "COU6503");
  assert.deepEqual(out.modules.map((mod) => mod.number), [1, 2, 3, 8]);
  const day = out.items.find((item) => item.id === "v1day_day-w3");
  assert.equal(day.type, "activity");
  assert.equal(day.notes, "<p>Notes <b>kept</b> from the planner.</p>");
  assert.equal(day.reflection, "<p>Reflection kept apart from notes.</p>");
  assert.equal(day.readings[0].chapterId, "ch1");
  assert.equal(day.readings[0].done, true);
  assert.equal(day.qa[0].answer, "A system, not only a person.");
  assert.equal(day.objectives[0].text, "Name a social system barrier");
  assert.equal(day.footnotes[0].text, "See Paradies 2006.");
  assert.equal(day.comments[0].text, "Revisit before the essay.");
  assert.equal(day.slideshows[0].slides[0].title, "Barriers");
  assert.equal(day.slides[0].body, "Racism sits in systems.");
  assert.equal(day.flagged, true);
  assert.equal(day.assessment, "A1 Photoyarn");
  assert.equal(day.v1.customNote, "do not drop me");
  assert.equal(day.v1.sourceText, "<p>Source page kept from version 1.</p>");
  assert.ok(day.hotspotActivities[0].imageDataUrl.blobId);
  assert.equal(out.blobs.length, 1);
  assert.match(out.blobs[0].dataUrl, /^data:image\/png/);
  const journal = out.items.find((item) => item.id === "v1day_day-journal");
  assert.equal(journal.type, "journal");
  assert.equal(journal.numberLabel, "8.1");
  assert.equal(journal.done, true);
  const assignment = out.assignments.find((row) => row.title === "A1 Photoyarn");
  assert.ok(assignment.linkedItemIds.includes(day.id));
  assert.equal(out.books[0].chapters[0].notes, "<p>Chapter notes kept.</p>");
  assert.equal(out.books[0].chapters[0].qa[0].question, "Why groups?");
  assert.equal(out.captures[0].text, "Remember the Perth deadline.");
  const hits = searchAll("reflection kept", out);
  assert.ok(hits.some((hit) => hit.title.includes("Social system barriers")));
});

test("merge keeps the newer copy and adds new ids", () => {
  const current = [{ id: "a", title: "local", updatedAt: 20 }, { id: "b", title: "stay", updatedAt: 5 }];
  const incoming = [{ id: "a", title: "older", updatedAt: 10 }, { id: "c", title: "new", updatedAt: 1 }];
  const merged = mergeById(current, incoming);
  assert.equal(merged.find((row) => row.id === "a").title, "local");
  assert.equal(merged.find((row) => row.id === "b").title, "stay");
  assert.equal(merged.find((row) => row.id === "c").title, "new");
});
