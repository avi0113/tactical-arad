import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demo } from "../src/lib/seed";

describe("demo display", () => {
  it("shows a fixed example where an event action differs from the library task", () => {
    const template = demo.templates.find((item) => item.id === "t03");
    const action = demo.events.find((item) => item.id === "e-fire")?.actions.find((item) => item.templateId === "t03");
    assert.ok(template);
    assert.ok(action);
    assert.equal(template.description.includes("רחוב מיתר"), false);
    assert.equal(action.description.includes("רחוב מיתר"), true);
    assert.ok(demo.templates.length >= 10);
    assert.equal(demo.events.length, 3);
  });
});
