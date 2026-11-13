/**
 * Optional example unit. Clearly marked example: true so it can be deleted in one step.
 * Dates are real instants: A1 is 13 Nov 2026, 2:00 pm Australia/Perth.
 */

import { DEADLINE_ZONE, zonedTimeToUtc } from "./dates.js";
import { blankSchedule } from "./srs.js";

const COURSE = "example-cou6508";

function item(partial) {
  return {
    courseId: COURSE,
    canvasUrl: "",
    notes: "",
    reflection: "",
    sourceText: "",
    sourceRange: "",
    readings: [],
    apaReference: "",
    url: "",
    attachments: [],
    tags: ["example"],
    highlights: [],
    qa: [],
    objectives: [],
    footnotes: [],
    comments: [],
    slideshows: [],
    hotspotActivities: [],
    assessment: "",
    flagged: false,
    done: false,
    doneAt: null,
    date: "",
    recordingUrl: "",
    transcript: "",
    slides: [],
    label: "",
    example: true,
    createdAt: Date.parse("2026-10-01T00:00:00Z"),
    updatedAt: Date.parse("2026-11-01T00:00:00Z"),
    deleted: false,
    ...partial
  };
}

export function exampleCourseRecords(now = Date.now()) {
  const a1Due = zonedTimeToUtc("2026-11-13", "14:00", DEADLINE_ZONE);
  const a2Due = zonedTimeToUtc("2026-12-07", "23:59", DEADLINE_ZONE);
  const submittedAt = zonedTimeToUtc("2026-11-11", "16:20", DEADLINE_ZONE);

  const courses = [{
    id: COURSE,
    code: "COU6508",
    title: "Counselling at the Cultural Interface",
    color: "#1f6f86",
    canvasUrl: "https://ecu.instructure.com/",
    startDate: "2026-10-19",
    term: "Example semester",
    timezone: DEADLINE_ZONE,
    example: true,
    createdAt: now,
    updatedAt: now,
    deleted: false
  }];

  const modules = [
    { id: `${COURSE}-w1`, courseId: COURSE, number: 1, position: 0, title: "Week 1 — Positioning and the cultural interface", example: true, createdAt: now, updatedAt: now, deleted: false },
    { id: `${COURSE}-w2`, courseId: COURSE, number: 2, position: 1, title: "Week 2 — Identity, culture, and practice", example: true, createdAt: now, updatedAt: now, deleted: false },
    { id: `${COURSE}-w3`, courseId: COURSE, number: 3, position: 2, title: "Week 3 — Social system barriers", example: true, createdAt: now, updatedAt: now, deleted: false }
  ];

  const items = [
    item({
      id: `${COURSE}-1-1`,
      moduleId: `${COURSE}-w1`,
      position: 0,
      numberLabel: "1.1",
      type: "page",
      title: "Unit welcome and how this hub works",
      canvasUrl: "https://ecu.instructure.com/",
      done: true,
      doneAt: Date.parse("2026-10-20T02:00:00Z"),
      notes: "<p>This is <strong>example data</strong>. Replace the Canvas link with the real COU6508 home page, then delete this unit when your own weeks are in.</p><p>Study Hub keeps a module list, a mark-as-done tick, and your notes on the same page.</p>",
      objectives: [{ id: `${COURSE}-obj-1`, text: "Find your way around the unit and this study hub", color: "#F5D98B" }]
    }),
    item({
      id: `${COURSE}-1-2`,
      moduleId: `${COURSE}-w1`,
      position: 1,
      numberLabel: "1.2",
      type: "reading",
      title: "The cultural interface",
      done: true,
      doneAt: Date.parse("2026-10-21T04:00:00Z"),
      apaReference: "Nakata, M. (2007). The cultural interface. The Australian Journal of Indigenous Education, 36(S1), 7–14.",
      url: "https://doi.org/10.1017/S1326011100004646",
      readings: [
        { id: `${COURSE}-r-nakata`, text: "Nakata, M. (2007). The cultural interface. The Australian Journal of Indigenous Education, 36(S1), 7–14.", done: true, chapterId: null }
      ],
      notes: "<p>Example note: the cultural interface is a place where Indigenous and Western knowledge systems meet, not a gap to be crossed once and left behind.</p>",
      highlights: [{ id: `${COURSE}-h1`, text: "The cultural interface is a lived meeting place of knowledge systems, not a one-off crossing.", color: "#F5D98B", createdAt: now }]
    }),
    item({
      id: `${COURSE}-1-3`,
      moduleId: `${COURSE}-w1`,
      position: 2,
      numberLabel: "1.3",
      type: "vc",
      title: "Week 1 virtual class",
      recordingUrl: "https://example.com/cou6508-week-1-recording",
      transcript: "Example transcript. The lecturer asks the group to notice whose knowledge is treated as the default in a counselling room, and whose knowledge has to be explained.",
      slides: [
        { id: `${COURSE}-s1`, title: "Slide 1 — Why the interface", body: "Counselling does not happen outside culture. Name the knowledge systems in the room." },
        { id: `${COURSE}-s2`, title: "Slide 2 — A question to sit with", body: "Where do I already stand at a cultural interface in my own life?" }
      ],
      notes: "<p>Example only. Paste the real Echo360 or Zoom link, and the transcript if Canvas gives you one.</p>"
    }),
    item({
      id: `${COURSE}-1-4`,
      moduleId: `${COURSE}-w1`,
      position: 3,
      numberLabel: "1.4",
      type: "journal",
      title: "Positioning journal",
      reflection: "<p>Example reflection. I am writing from Adelaide, studying an ECU unit whose deadlines sit on Perth time. My own cultural location is part of how I hear this week, not a footnote to add at the end.</p>",
      done: true,
      doneAt: Date.parse("2026-10-22T08:00:00Z")
    }),
    item({
      id: `${COURSE}-2-1`,
      moduleId: `${COURSE}-w2`,
      position: 0,
      numberLabel: "2.1",
      type: "page",
      title: "Culture, identity, and the counselling relationship",
      notes: "<p>Example page. Use this for the week’s overview: what identity is being asked to do in the counselling relationship, and what the readings complicate.</p>",
      tags: ["example", "identity"]
    }),
    item({
      id: `${COURSE}-2-2`,
      moduleId: `${COURSE}-w2`,
      position: 1,
      numberLabel: "2.2",
      type: "activity",
      title: "Activity: map your cultural location",
      notes: "<p>Example activity. Sketch the places, languages, families, and institutions that shape how you enter a counselling conversation. Mark what is easy to see, and what you usually leave unnamed.</p>"
    }),
    item({
      id: `${COURSE}-2-3`,
      moduleId: `${COURSE}-w2`,
      position: 2,
      numberLabel: "2.3",
      type: "discussion",
      title: "Discussion: what does culturally responsive practice ask of me?",
      date: "2026-11-18",
      notes: "<p>Example discussion prompt. Post one concrete practice you would change after this week, and one thing you are not yet sure how to change.</p>"
    }),
    item({
      id: `${COURSE}-3-1`,
      moduleId: `${COURSE}-w3`,
      position: 0,
      numberLabel: "3.1",
      type: "journal",
      title: "Social system barriers journal reflection",
      canvasUrl: "https://ecu.instructure.com/",
      assessment: "A1 Photoyarn",
      tags: ["example", "A1", "journal"],
      reflection: "<p>Example journal. Social system barriers are not only stories about other people. Racism, policy, and institutional habit shape who is believed, who waits, and whose distress is read as cultural.</p><p>For Photoyarn I want the image to carry a barrier I have seen, and the writing to say what the image cannot.</p>",
      qa: [{
        id: `${COURSE}-qa-31`,
        question: "What is a social system barrier, in your own words?",
        answer: "A barrier built into how institutions, policies, and everyday habits distribute safety, time, and belief — not only an individual attitude."
      }]
    }),
    item({
      id: `${COURSE}-3-2`,
      moduleId: `${COURSE}-w3`,
      position: 1,
      numberLabel: "3.2",
      type: "reading",
      title: "Social system barriers: racism",
      apaReference: "Berman, G., & Paradies, Y. (2010). Racism, disadvantage and multiculturalism: Towards effective anti-racist praxis. Ethnic and Racial Studies, 33(2), 214–232. https://doi.org/10.1080/01419870802302272",
      url: "https://doi.org/10.1080/01419870802302272",
      readings: [
        {
          id: `${COURSE}-r-berman`,
          text: "Berman, G., & Paradies, Y. (2010). Racism, disadvantage and multiculturalism: Towards effective anti-racist praxis. Ethnic and Racial Studies, 33(2), 214–232.",
          done: false,
          chapterId: null
        },
        {
          id: `${COURSE}-r-paradies`,
          text: "Paradies, Y. (2006). A systematic review of empirical research on self-reported racism and health. International Journal of Epidemiology, 35(4), 888–901.",
          done: false,
          chapterId: null
        }
      ],
      notes: "<p>Example reading notes. Unit outlines often date Berman and Paradies as 2008 because the article was first published online that year. The journal issue is 2010, volume 33, issue 2, pages 214–232. The APA 7 reference above uses the issue year.</p><p><mark>Racism is not only interpersonal. It is built into systems that shape health and opportunity.</mark></p><p><mark>Anti-racist praxis asks counselling to name racism, not only disadvantage.</mark></p>",
      highlights: [
        { id: `${COURSE}-h2`, text: "Racism is not only interpersonal. It is built into systems that shape health and opportunity.", color: "#F5D98B", createdAt: now },
        { id: `${COURSE}-h3`, text: "Anti-racist praxis asks counselling to name racism, not only disadvantage.", color: "#C9E4B0", createdAt: now }
      ],
      qa: [{
        id: `${COURSE}-qa-32`,
        question: "What distinction do Berman and Paradies draw that matters for counselling?",
        answer: "They separate work that tries to ease disadvantage from work that addresses racism itself. Naming racism is part of anti-racist praxis, not an optional extra beside multicultural language."
      }]
    }),
    item({
      id: `${COURSE}-3-3`,
      moduleId: `${COURSE}-w3`,
      position: 2,
      numberLabel: "3.3",
      type: "quiz",
      title: "Week 3 revision",
      notes: "<p>Example quiz. These prompts are study questions, not the unit’s official quiz.</p>",
      qa: [
        {
          id: `${COURSE}-qa-33a`,
          question: "Why does a counselling response that only talks about disadvantage miss something?",
          answer: "Disadvantage can be described without naming racism. Berman and Paradies argue that anti-racist praxis has to name racism and not hide it inside broader equity language."
        },
        {
          id: `${COURSE}-qa-33b`,
          question: "What kind of health finding is strongest in Paradies (2006)?",
          answer: "The review’s strongest and most consistent findings link self-reported racism with negative mental health outcomes and health-related behaviours."
        }
      ]
    })
  ];

  const assignments = [
    {
      id: `${COURSE}-a1`,
      courseId: COURSE,
      title: "A1 Photoyarn",
      dueAt: a1Due,
      timezone: DEADLINE_ZONE,
      weighting: 40,
      wordCount: 1500,
      rubric: {
        columns: ["Needs work", "Developing", "Accomplished"],
        rows: [
          { id: `${COURSE}-rub-1`, criterion: "Engagement with the cultural interface literature", cells: ["Names a reading with little connection to the image.", "Connects the image to at least one reading.", "The image and the writing think together with the readings."] },
          { id: `${COURSE}-rub-2`, criterion: "Reflexive account of your positioning", cells: ["Position is missing or generic.", "You locate yourself, with some detail.", "You show how your location shapes what you can and cannot see."] },
          { id: `${COURSE}-rub-3`, criterion: "Care and ethics", cells: ["People or communities are exposed.", "Consent and context are mentioned.", "The piece is careful about who is shown, and why."] }
        ]
      },
      status: "submitted",
      submittedAt,
      turnitin: 11,
      mark: null,
      markOutOf: 100,
      feedback: "",
      linkedItemIds: [`${COURSE}-3-1`, `${COURSE}-3-2`],
      notes: "Example assignment. Status is submitted, Turnitin 11%, mark not back yet. Due 13 November 2026, 2:00 pm AWST.",
      example: true,
      createdAt: now,
      updatedAt: now,
      deleted: false
    },
    {
      id: `${COURSE}-a2`,
      courseId: COURSE,
      title: "A2",
      dueAt: a2Due,
      timezone: DEADLINE_ZONE,
      weighting: 60,
      wordCount: 2500,
      rubric: { columns: ["Needs work", "Developing", "Accomplished"], rows: [] },
      status: "not_started",
      submittedAt: null,
      turnitin: null,
      mark: null,
      markOutOf: 100,
      feedback: "",
      linkedItemIds: [],
      notes: "Example assignment. Due 7 December 2026, 11:59 pm AWST. The weighting is a placeholder so the grade page has a full 100% to work with. Change it to match the unit outline.",
      example: true,
      createdAt: now,
      updatedAt: now,
      deleted: false
    }
  ];

  const cards = [];
  const sources = items.flatMap((row) => {
    const fromQa = (row.qa || []).filter((qa) => qa.question && qa.answer).map((qa) => ({
      front: qa.question,
      back: qa.answer,
      kind: "qa",
      itemId: row.id
    }));
    const fromMarks = (row.highlights || []).filter((h) => h.text).map((h) => ({
      front: h.text,
      back: `From ${row.numberLabel} ${row.title}. Say it in your own words, then check the item.`,
      kind: "highlight",
      itemId: row.id
    }));
    return [...fromQa, ...fromMarks];
  });
  for (const source of sources) {
    const schedule = blankSchedule(now - 60 * 1000);
    cards.push({
      id: `card_${source.itemId}_${source.kind}_${source.front.slice(0, 24).replace(/\s+/g, "-")}`,
      courseId: COURSE,
      itemId: source.itemId,
      front: source.front,
      back: source.back,
      example: true,
      ...schedule,
      createdAt: now,
      updatedAt: now,
      deleted: false
    });
  }

  const books = [{
    id: `${COURSE}-book`,
    title: "Example reading list — cultural interface",
    author: "Collected unit readings",
    fullReference: "",
    inTextCitation: "",
    color: "#9d3f2c",
    courseId: COURSE,
    example: true,
    chapters: [
      {
        id: `${COURSE}-ch-berman`,
        title: "Berman & Paradies — anti-racist praxis",
        tags: ["racism", "week 3"],
        sourceText: "",
        sourceRange: "Ethnic and Racial Studies, 33(2), 214–232",
        notes: "<p>Example chapter note. Keep long quotes in your own files. This card is only a pointer.</p>",
        qa: [],
        footnotes: [],
        comments: [],
        assessment: "A1 Photoyarn",
        flagged: false,
        updatedAt: now
      },
      {
        id: `${COURSE}-ch-paradies`,
        title: "Paradies 2006 — racism and health",
        tags: ["racism", "health"],
        sourceText: "",
        sourceRange: "International Journal of Epidemiology, 35(4), 888–901",
        notes: "<p>Strongest findings in the review: negative mental health outcomes and health-related behaviours.</p>",
        qa: [],
        footnotes: [],
        comments: [],
        assessment: "",
        flagged: true,
        updatedAt: now
      }
    ],
    createdAt: now,
    updatedAt: now,
    deleted: false
  }];

  return {
    courses,
    modules,
    items,
    assignments,
    books,
    journal: [],
    cards,
    captures: [{
      id: `${COURSE}-cap`,
      text: "Example capture: check whether A1’s Turnitin score is the similarity index (11%) and not the grade.",
      example: true,
      createdAt: now,
      updatedAt: now,
      deleted: false
    }],
    reviews: [],
    blobs: []
  };
}

export const EXAMPLE_COURSE_ID = COURSE;
