import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { applyTemplatePatch } from "../src/lib/domain";
import { readDb, updateDb } from "../src/lib/store";

describe("file store", () => {
  let directory = "";

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "arad-ops-"));
    process.env.OPS_DB_PATH = path.join(directory, "db.json");
  });

  after(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("seeds once and keeps event actions when a template changes", async () => {
    const first = await readDb();
    const again = await readDb();
    assert.equal(again.events.length, first.events.length);
    assert.ok(first.templates.length > 0);

    const fire = first.events.find((item) => item.id === "e-fire");
    assert.ok(fire);
    const original = fire.actions.find((action) => action.templateId === "t03");
    assert.ok(original);

    await updateDb((db) => {
      applyTemplatePatch(db, "t03", { title: "נוסח מעודכן במאגר בלבד", description: "טקסט חדש" });
      return "t03";
    });

    const saved = await readDb();
    const savedTemplate = saved.templates.find((item) => item.id === "t03");
    const savedAction = saved.events.find((item) => item.id === "e-fire")?.actions.find((action) => action.templateId === "t03");
    assert.equal(savedTemplate?.title, "נוסח מעודכן במאגר בלבד");
    assert.equal(savedAction?.title, original.title);
    assert.equal(savedAction?.description, original.description);
  });
});
