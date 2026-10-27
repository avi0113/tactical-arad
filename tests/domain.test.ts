import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addActionsFromTemplates,
  applyActionMove,
  applyActionPatch,
  applyActionsPost,
  applyEventPost,
  applyTemplateDelete,
  applyTemplatePatch,
  applyTemplatePost,
  duplicateAction,
  promoteAction,
  snapshotTemplate,
} from "../src/lib/domain";
import { createSeed } from "../src/lib/seed";
import { fromJerusalemInput, toDatetimeLocal } from "../src/lib/time";
import type { Db, TemplateInput } from "../src/lib/types";

function emptyDb(): Db {
  return { templates: [], events: [] };
}

const task: TemplateInput = {
  title: "חסימת צירים",
  description: "נוסח כללי",
  category: "ביטחון",
  priority: "high",
  estimatedMinutes: 20,
  defaultRole: "שיטור",
  steps: ["סימון", "הצבה"],
};

describe("independent copies", () => {
  it("keeps a template and an event action apart after either side changes", () => {
    const db = emptyDb();
    const templateId = applyTemplatePost(db, task);
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "חירום",
      status: "open",
      severity: "high",
      location: "ערד",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    addActionsFromTemplates(db, eventId, [templateId]);
    const action = db.events[0].actions[0];
    action.steps[0].text = "שונה באירוע";
    assert.equal(db.templates[0].steps[0], "סימון");

    applyTemplatePatch(db, templateId, { title: "נוסח חדש במאגר", description: "אחר", steps: ["א", "ב", "ג"] });
    assert.equal(action.title, "חסימת צירים");
    assert.equal(action.description, "נוסח כללי");
    assert.deepEqual(
      action.steps.map((step) => step.text),
      ["שונה באירוע", "הצבה"],
    );

    applyActionPatch(db, eventId, action.id, { title: "חסימה ברחוב מיתר", notes: "רק מהשכונה" });
    assert.equal(db.templates[0].title, "נוסח חדש במאגר");
    assert.equal(db.events[0].actions[0].notes, "רק מהשכונה");
  });

  it("keeps event actions when the source template is deleted", () => {
    const db = emptyDb();
    const templateId = applyTemplatePost(db, task);
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "חירום",
      status: "open",
      severity: "medium",
      location: "",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    addActionsFromTemplates(db, eventId, [templateId]);
    applyTemplateDelete(db, templateId);
    assert.equal(db.templates.length, 0);
    assert.equal(db.events[0].actions.length, 1);
    assert.equal(db.events[0].actions[0].title, "חסימת צירים");
  });

});

describe("action list", () => {
  it("duplicates an action as a fresh pending copy", () => {
    const db = emptyDb();
    const templateId = applyTemplatePost(db, task);
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "תרגיל",
      status: "in_progress",
      severity: "low",
      location: "",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    addActionsFromTemplates(db, eventId, [templateId]);
    const original = db.events[0].actions[0];
    applyActionPatch(db, eventId, original.id, { status: "done" });
    const copyId = duplicateAction(db, eventId, original.id);
    const copy = db.events[0].actions.find((action) => action.id === copyId);
    assert.ok(copy);
    assert.equal(copy.status, "pending");
    assert.equal(copy.steps.every((step) => !step.done), true);
    assert.equal(original.status, "done");
    assert.notEqual(copy.steps[0].id, original.steps[0].id);
  });

  it("rejects an empty task title and a missing template", () => {
    const db = emptyDb();
    assert.throws(() => applyTemplatePost(db, { ...task, title: "   " }), /שם המשימה/);
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "חירום",
      status: "open",
      severity: "high",
      location: "",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    assert.throws(() => addActionsFromTemplates(db, eventId, ["missing"]), /לא נמצאת/);
    assert.throws(() => addActionsFromTemplates(db, eventId, []), /לא נבחרו/);
  });

  it("moves an action earlier in the event list", () => {
    const db = emptyDb();
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "חירום",
      status: "open",
      severity: "high",
      location: "",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    applyActionsPost(db, eventId, { action: { ...task, status: "pending", assignee: "", notes: "", steps: [] } });
    applyActionsPost(db, eventId, {
      action: { ...task, title: "שנייה", status: "pending", assignee: "", notes: "", steps: [] },
    });
    const [first, second] = db.events[0].actions;
    applyActionMove(db, eventId, second.id, { direction: "up" });
    assert.deepEqual(
      db.events[0].actions.map((action) => action.title),
      ["שנייה", first.title],
    );
    assert.deepEqual(
      db.events[0].actions.map((action) => action.order),
      [0, 1],
    );
    assert.equal(second.id === db.events[0].actions[0].id, true);
  });

  it("promotes an action and still lets the two records diverge", () => {
    const db = emptyDb();
    const eventId = applyEventPost(db, {
      title: "אירוע",
      description: "",
      eventType: "חירום",
      status: "open",
      severity: "high",
      location: "",
      commander: "",
      startedAt: "2026-10-27T08:00:00.000Z",
    });
    const templateId = applyTemplatePost(db, task);
    addActionsFromTemplates(db, eventId, [templateId]);
    const action = db.events[0].actions[0];
    const promoted = promoteAction(db, eventId, action.id);
    applyTemplatePatch(db, promoted, { title: "שם אחר במאגר" });
    assert.equal(action.title, "חסימת צירים");
    assert.notEqual(db.templates.find((item) => item.id === promoted)?.title, action.title);
  });
});

describe("seed", () => {
  it("ships a customized event action that no longer matches its template", () => {
    const db = createSeed(new Date("2026-10-27T12:00:00.000Z"));
    const template = db.templates.find((item) => item.id === "t03");
    const fire = db.events.find((item) => item.id === "e-fire");
    assert.ok(template);
    assert.ok(fire);
    const action = fire.actions.find((item) => item.templateId === "t03");
    assert.ok(action);
    assert.notEqual(action.description, template.description);
    assert.equal(template.description.includes("רחוב מיתר"), false);
    assert.equal(action.description.includes("רחוב מיתר"), true);
    assert.ok(fire.actions.length >= 5);
    assert.ok(db.templates.length >= 10);
  });
});

describe("jerusalem time", () => {
  it("round-trips summer and winter wall clocks", () => {
    assert.equal(fromJerusalemInput("2026-07-15T16:30"), "2026-07-15T13:30:00.000Z");
    assert.equal(toDatetimeLocal("2026-07-15T13:30:00.000Z"), "2026-07-15T16:30");
    assert.equal(fromJerusalemInput("2026-01-15T16:30"), "2026-01-15T14:30:00.000Z");
    assert.equal(toDatetimeLocal("2026-01-15T14:30:00.000Z"), "2026-01-15T16:30");
  });
});

describe("snapshot", () => {
  it("does not reuse the template step array", () => {
    const db = emptyDb();
    const id = applyTemplatePost(db, task);
    const template = db.templates[0];
    const action = snapshotTemplate(template, 0, "2026-10-27T08:00:00.000Z");
    action.steps.pop();
    assert.equal(template.steps.length, 2);
    assert.equal(id, template.id);
  });
});
