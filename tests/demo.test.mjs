import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
function read(name) {
  return readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
}

function loadDemo() {
  const sandbox = {};
  runInNewContext(read("demo.js"), sandbox);
  return sandbox.DEMO;
}

describe("local demo", () => {
  it("shows a fixed example where an event action differs from the library task", () => {
    const demo = loadDemo();
    const template = demo.templates.find((item) => item.id === "t03");
    const action = demo.events.find((item) => item.id === "e-fire")?.actions.find((item) => item.templateId === "t03");
    assert.ok(template);
    assert.ok(action);
    assert.equal(template.description.includes("רחוב מיתר"), false);
    assert.equal(action.description.includes("רחוב מיתר"), true);
    assert.ok(demo.templates.length >= 10);
    assert.equal(demo.events.length, 3);
  });

  it("opens from local files and does not call a server", () => {
    const html = read("index.html");
    const app = read("app.js");
    const css = read("styles.css");
    assert.match(html, /src="demo\.js"/);
    assert.match(html, /src="app\.js"/);
    assert.match(html, /href="styles\.css"/);
    assert.doesNotMatch(`${html}\n${app}\n${css}`, /https?:\/\//);
    assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  });
});
