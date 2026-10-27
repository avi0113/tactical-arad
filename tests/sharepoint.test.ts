import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { graphSitePath, loadSharePointSettings, parseSiteUrl } from "../src/lib/sharepoint/config";
import { createGraphClient } from "../src/lib/sharepoint/graph";
import { actionToFields, eventToFields, fieldsToAction, fieldsToEvent, fieldsToTemplate, templateToFields } from "../src/lib/sharepoint/mapping";
import { createSeed } from "../src/lib/seed";
import type { EventAction, TaskTemplate } from "../src/lib/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sharepoint config", () => {
  it("parses a site url into a graph path", () => {
    const parsed = parseSiteUrl("https://contoso.sharepoint.com/sites/arad/default.aspx");
    assert.deepEqual(parsed, { hostname: "contoso.sharepoint.com", path: "/sites/arad" });
    assert.equal(graphSitePath(parsed), "/sites/contoso.sharepoint.com:/sites/arad");
  });

  it("requires credentials and a site", () => {
    assert.throws(
      () => loadSharePointSettings({ SHAREPOINT_SITE_URL: "https://contoso.sharepoint.com/sites/arad" }),
      /SHAREPOINT_TENANT_ID/,
    );
    const settings = loadSharePointSettings({
      SHAREPOINT_SITE_URL: "https://contoso.sharepoint.com/sites/arad/",
      SHAREPOINT_TENANT_ID: "tenant",
      SHAREPOINT_CLIENT_ID: "client",
      SHAREPOINT_CLIENT_SECRET: "secret",
      SHAREPOINT_LIST_TASKS: "משימות שלנו",
    });
    assert.equal(settings.auth.kind, "app");
    assert.equal(settings.lists.tasks, "משימות שלנו");
    assert.equal(settings.lists.events, "אירועים מבצעיים");
  });
});

describe("sharepoint mapping", () => {
  it("round-trips a template, an event, and an action", () => {
    const db = createSeed(new Date("2026-10-27T12:00:00.000Z"));
    const template = db.templates.find((item) => item.id === "t03");
    const event = db.events.find((item) => item.id === "e-fire");
    assert.ok(template);
    assert.ok(event);
    const action = event.actions.find((item) => item.templateId === "t03");
    assert.ok(action);

    const fallback = { id: "sp:1", createdAt: template.createdAt, updatedAt: template.updatedAt };
    const { actions: _actions, ...eventWithoutActions } = event;
    assert.deepEqual(fieldsToTemplate(templateToFields(template), fallback), template);
    assert.deepEqual(fieldsToEvent(eventToFields(event), fallback), eventWithoutActions);
    const parsed = fieldsToAction(actionToFields(event.id, action), { ...fallback, id: "sp:9" });
    assert.equal(parsed.eventId, event.id);
    assert.deepEqual(parsed.action, action);
  });

  it("keeps the copied action fields independent from the template fields", () => {
    const template: TaskTemplate = {
      id: "t03",
      title: "חסימת צירי גישה",
      description: "נוסח כללי",
      category: "ביטחון",
      priority: "high",
      estimatedMinutes: 30,
      defaultRole: "שיטור עירוני",
      steps: ["סימון"],
      createdAt: "2026-10-27T08:00:00.000Z",
      updatedAt: "2026-10-27T08:00:00.000Z",
    };
    const action: EventAction = {
      id: "a1",
      templateId: template.id,
      title: "חסימת רחוב מיתר",
      description: "חסימה מקומית",
      category: template.category,
      priority: "high",
      status: "in_progress",
      assignee: "רועי שמש",
      estimatedMinutes: 30,
      steps: [{ id: "s1", text: "סימון", done: false }],
      notes: "לא לחסום את הכבאיות",
      order: 3,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      completedAt: null,
    };
    const templateFields = templateToFields({ ...template, title: "נוסח חדש" });
    const actionFields = actionToFields("e-fire", action);
    assert.equal(templateFields.Title, "נוסח חדש");
    assert.equal(actionFields.Title, "חסימת רחוב מיתר");
    assert.equal(actionFields.OpsTemplateId, "t03");
    assert.equal(actionFields.OpsBody.includes("מקומית"), true);
  });
});

describe("graph client", () => {
  it("reuses an application token", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("oauth2")) {
        const body = String(init?.body);
        assert.equal(body.includes("client_secret=secret"), true);
        assert.equal(body.includes("grant_type=client_credentials"), true);
        return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      }
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), "Bearer token-1");
      return jsonResponse({ id: "site-1" });
    };
    const client = createGraphClient(
      { kind: "app", tenantId: "tenant", clientId: "client", clientSecret: "secret" },
      fetchImpl,
    );
    await client.request({ method: "GET", path: "/sites/site-1" });
    await client.request({ method: "GET", path: "/sites/site-1" });
    assert.equal(calls.filter((url) => url.includes("oauth2")).length, 1);
  });

  it("refreshes an application token once after HTTP 401", async () => {
    let tokens = 0;
    let graphs = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("oauth2")) {
        tokens += 1;
        return jsonResponse({ access_token: `token-${tokens}`, expires_in: 3600 });
      }
      graphs += 1;
      if (graphs === 1) return jsonResponse({ error: { code: "InvalidAuthenticationToken", message: "expired" } }, 401);
      return jsonResponse({ ok: true });
    };
    const client = createGraphClient(
      { kind: "app", tenantId: "tenant", clientId: "client", clientSecret: "secret" },
      fetchImpl,
    );
    const result = await client.request<{ ok?: boolean }>({ method: "GET", path: "/sites/site-1" });
    assert.equal(result.ok, true);
    assert.equal(tokens, 2);
    assert.equal(graphs, 2);
  });
});
