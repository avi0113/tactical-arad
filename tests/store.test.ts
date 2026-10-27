import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { applyTemplatePatch } from "../src/lib/domain";
import { DEFAULT_LISTS } from "../src/lib/sharepoint/config";
import { createSharePointRepository } from "../src/lib/sharepoint/repository";
import { readDb, resetDb, updateDb, useRepository } from "../src/lib/store";
import { FakeGraph } from "./fake-graph";

describe("sharepoint store", { concurrency: 1 }, () => {
  let graph: FakeGraph;

  beforeEach(() => {
    graph = new FakeGraph();
    useRepository(createSharePointRepository(graph, { siteId: "site-1", lists: { ...DEFAULT_LISTS } }));
  });

  it("seeds lists once and keeps an event action when its template changes", async () => {
    const first = await readDb();
    const again = await readDb();
    assert.equal(again.events.length, first.events.length);
    assert.equal(again.templates.length, first.templates.length);
    assert.ok(graph.list(DEFAULT_LISTS.tasks));
    assert.ok(graph.list(DEFAULT_LISTS.events));
    assert.ok(graph.list(DEFAULT_LISTS.actions));
    assert.equal(graph.list(DEFAULT_LISTS.meta)?.items.some((item) => item.fields.OpsAppId === "initialized"), true);

    const fire = first.events.find((item) => item.id === "e-fire");
    const original = fire?.actions.find((action) => action.templateId === "t03");
    assert.ok(original);

    graph.resetCounts();
    await updateDb((db) => {
      applyTemplatePatch(db, "t03", { title: "נוסח מעודכן במאגר בלבד", description: "טקסט חדש" });
      return "t03";
    });
    assert.equal(graph.patchCount, 1);
    assert.equal(graph.createCount, 0);
    assert.equal(graph.deleteCount, 0);

    const saved = await readDb();
    const savedTemplate = saved.templates.find((item) => item.id === "t03");
    const savedAction = saved.events.find((item) => item.id === "e-fire")?.actions.find((action) => action.templateId === "t03");
    assert.equal(savedTemplate?.title, "נוסח מעודכן במאגר בלבד");
    assert.equal(savedTemplate?.description, "טקסט חדש");
    assert.equal(savedAction?.title, original.title);
    assert.equal(savedAction?.description, original.description);
    assert.equal(graph.list(DEFAULT_LISTS.actions)?.items.find((item) => item.fields.OpsAppId === original.id)?.fields.OpsBody, original.description);
  });

  it("does not write when nothing changed, and does not reseed an empty repository", async () => {
    await readDb();
    graph.resetCounts();
    await updateDb((db) => db);
    assert.equal(graph.patchCount, 0);
    assert.equal(graph.createCount, 0);

    await updateDb((db) => {
      db.templates = [];
      db.events = [];
      return null;
    });
    const empty = await readDb();
    assert.equal(empty.templates.length, 0);
    assert.equal(empty.events.length, 0);

    const restored = await resetDb();
    assert.ok(restored.templates.length > 0);
    assert.ok(restored.events.length > 0);
    const afterReset = await readDb();
    assert.equal(afterReset.templates.length, restored.templates.length);
  });

  it("removes an event's actions from SharePoint without deleting the task library", async () => {
    const initial = await readDb();
    const templateCount = initial.templates.length;
    await updateDb((db) => {
      db.events = db.events.filter((event) => event.id !== "e-fire");
      return null;
    });
    const saved = await readDb();
    assert.equal(saved.events.some((event) => event.id === "e-fire"), false);
    assert.equal(saved.templates.length, templateCount);
    assert.equal(graph.list(DEFAULT_LISTS.actions)?.items.some((item) => item.fields.OpsEventId === "e-fire"), false);
    assert.equal(graph.list(DEFAULT_LISTS.tasks)?.items.some((item) => item.fields.OpsAppId === "t03"), true);
  });
});
