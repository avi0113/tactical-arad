import { DomainError } from "../domain";
import { createSeed } from "../seed";
import type { Db, EventAction, OpsEvent, TaskTemplate } from "../types";
import { graphSitePath, parseSiteUrl, type ListNames } from "./config";
import type { GraphClient } from "./graph";
import {
  ACTION_COLUMNS,
  EVENT_COLUMNS,
  META_COLUMNS,
  TASK_COLUMNS,
  actionToFields,
  columnDefinition,
  eventToFields,
  fieldsToAction,
  fieldsToEvent,
  fieldsToTemplate,
  sameFields,
  templateToFields,
  type ColumnSpec,
  type Fields,
} from "./mapping";

export type RepositoryConfig = {
  siteId?: string;
  siteUrl?: string;
  lists: ListNames;
};

type ListKey = keyof ListNames;

type GraphList = { id: string; displayName?: string };
type GraphItem = {
  id: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  fields?: Record<string, unknown>;
};

type Loaded = {
  db: Db;
  initialized: boolean;
};

const LIST_COPY: Record<ListKey, { description: string; columns: ColumnSpec[] }> = {
  tasks: {
    description: "מאגר משימות מוכנות מראש. שינוי כאן לא מעדכן פעולות שכבר נוספו לאירועים.",
    columns: TASK_COLUMNS,
  },
  events: {
    description: "אירועים מבצעיים.",
    columns: EVENT_COLUMNS,
  },
  actions: {
    description: "פעולות נדרשות לכל אירוע. כל שורה היא עותק עצמאי, לא קישור חי למשימה.",
    columns: ACTION_COLUMNS,
  },
  meta: {
    description: "מצב פנימי של מערכת המשימות.",
    columns: META_COLUMNS,
  },
};

function asFields(fields: Record<string, unknown> | undefined): Fields {
  const result: Fields = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    if (typeof value === "string") result[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") result[key] = String(value);
  }
  return result;
}

function assertUnique(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new DomainError(`מזהה כפול ברשימת SharePoint «${label}»: ${id}`);
    seen.add(id);
  }
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let index = 0;
  const size = Math.min(4, items.length);
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    }),
  );
}

function mergeMissing(current: Db, seed: Db): Db {
  const templateIds = new Set(current.templates.map((template) => template.id));
  const templates = [...current.templates];
  for (const template of seed.templates) {
    if (!templateIds.has(template.id)) templates.push(template);
  }
  const eventIds = new Set(current.events.map((event) => event.id));
  const events = current.events.map((event) => {
    const seeded = seed.events.find((item) => item.id === event.id);
    if (!seeded) return event;
    const actionIds = new Set(event.actions.map((action) => action.id));
    const actions = [...event.actions];
    for (const action of seeded.actions) {
      if (!actionIds.has(action.id)) actions.push(action);
    }
    return { ...event, actions };
  });
  for (const event of seed.events) {
    if (!eventIds.has(event.id)) events.push(structuredClone(event));
  }
  return { templates, events };
}

export function createSharePointRepository(graph: GraphClient, config: RepositoryConfig) {
  let siteId = config.siteId?.trim() || "";
  const listIds = new Map<ListKey, string>();
  let ready = false;
  const itemIds: Record<ListKey, Map<string, string>> = {
    tasks: new Map(),
    events: new Map(),
    actions: new Map(),
    meta: new Map(),
  };

  async function resolveSite(): Promise<string> {
    if (siteId) return siteId;
    if (!config.siteUrl) throw new DomainError("חסרה כתובת אתר SharePoint", 503);
    const found = await graph.request<{ id?: string }>({
      method: "GET",
      path: graphSitePath(parseSiteUrl(config.siteUrl)),
    });
    if (!found.id) throw new DomainError("לא הצלחתי לזהות את אתר SharePoint", 502);
    siteId = found.id;
    return siteId;
  }

  async function pages<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    let next: string | undefined = path;
    while (next) {
      const page: { value?: T[]; "@odata.nextLink"?: string } = await graph.request({ method: "GET", path: next });
      rows.push(...(page.value ?? []));
      next = page["@odata.nextLink"];
    }
    return rows;
  }

  async function ignoreExisting(request: { method: "POST"; path: string; body: unknown }) {
    try {
      await graph.request(request);
    } catch (error) {
      if (error instanceof DomainError && (error.status === 409 || /already exists|nameAlreadyExists|כבר קיים/i.test(error.message))) {
        return;
      }
      throw error;
    }
  }

  async function ensure() {
    if (ready) return;
    const site = await resolveSite();
    const existing = await pages<GraphList>(`/sites/${site}/lists?$select=id,displayName&$top=200`);
    for (const key of Object.keys(LIST_COPY) as ListKey[]) {
      const displayName = config.lists[key];
      const matches = existing.filter((list) => list.displayName === displayName);
      if (matches.length > 1) {
        throw new DomainError(`נמצאו כמה רשימות SharePoint בשם «${displayName}». השאירו אחת, או הגדירו שם ייחודי במשתני הסביבה.`);
      }
      let listId = matches[0]?.id;
      if (!listId) {
        const created = await graph.request<GraphList>({
          method: "POST",
          path: `/sites/${site}/lists`,
          body: {
            displayName,
            description: LIST_COPY[key].description,
            list: { template: "genericList" },
          },
        });
        if (!created.id) throw new DomainError(`לא נוצרה הרשימה «${displayName}» ב-SharePoint`, 502);
        listId = created.id;
      }
      listIds.set(key, listId);
      const columns = await pages<{ name?: string }>(`/sites/${site}/lists/${listId}/columns?$select=name&$top=200`);
      const names = new Set(columns.map((column) => column.name));
      for (const spec of LIST_COPY[key].columns) {
        if (names.has(spec.name)) continue;
        await ignoreExisting({
          method: "POST",
          path: `/sites/${site}/lists/${listId}/columns`,
          body: columnDefinition(spec),
        });
      }
    }
    ready = true;
  }

  function requireList(key: ListKey): string {
    const id = listIds.get(key);
    if (!id) throw new DomainError("רשימות SharePoint עדיין לא מוכנות", 500);
    return id;
  }

  async function loadItems(key: ListKey): Promise<GraphItem[]> {
    const site = await resolveSite();
    return pages<GraphItem>(`/sites/${site}/lists/${requireList(key)}/items?$expand=fields&$top=200`);
  }

  function fallbackFor(item: GraphItem): { id: string; createdAt: string; updatedAt: string } {
    const now = new Date().toISOString();
    return {
      id: `sp:${item.id}`,
      createdAt: item.createdDateTime || now,
      updatedAt: item.lastModifiedDateTime || item.createdDateTime || now,
    };
  }

  async function load(): Promise<Loaded> {
    const [taskItems, eventItems, actionItems, metaItems] = await Promise.all([
      loadItems("tasks"),
      loadItems("events"),
      loadItems("actions"),
      loadItems("meta"),
    ]);
    itemIds.tasks.clear();
    itemIds.events.clear();
    itemIds.actions.clear();
    itemIds.meta.clear();

    const templates: TaskTemplate[] = taskItems.map((item) => {
      const template = fieldsToTemplate(asFields(item.fields), fallbackFor(item));
      itemIds.tasks.set(template.id, item.id);
      return template;
    });
    const events: OpsEvent[] = eventItems.map((item) => {
      const event = { ...fieldsToEvent(asFields(item.fields), fallbackFor(item)), actions: [] as EventAction[] };
      itemIds.events.set(event.id, item.id);
      return event;
    });
    const actions = actionItems.map((item) => {
      const parsed = fieldsToAction(asFields(item.fields), fallbackFor(item));
      itemIds.actions.set(parsed.action.id, item.id);
      return parsed;
    });
    assertUnique(templates.map((template) => template.id), config.lists.tasks);
    assertUnique(events.map((event) => event.id), config.lists.events);
    assertUnique(actions.map((row) => row.action.id), config.lists.actions);

    const byEvent = new Map<string, EventAction[]>(events.map((event) => [event.id, []]));
    for (const row of actions) {
      const bucket = byEvent.get(row.eventId);
      if (!bucket) throw new DomainError(`הפעולה «${row.action.title}» משויכת לאירוע שלא קיים (${row.eventId})`);
      bucket.push(row.action);
    }
    for (const event of events) {
      event.actions = (byEvent.get(event.id) ?? []).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    }
    for (const item of metaItems) {
      const appId = asFields(item.fields).OpsAppId?.trim();
      if (appId) itemIds.meta.set(appId, item.id);
    }
    const initialized = metaItems.some((item) => {
      const fields = asFields(item.fields);
      return fields.OpsAppId?.trim() === "initialized" && fields.OpsMeta?.trim() === "true";
    });
    return { db: { templates, events }, initialized };
  }

  async function write(request: { method: "POST" | "PATCH" | "DELETE"; path: string; body?: unknown }) {
    try {
      return await graph.request<{ id?: string }>(request);
    } catch (error) {
      if (error instanceof DomainError && /not exist|not recognized|Could not find|Invalid field|does not exist/i.test(error.message)) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return graph.request<{ id?: string }>(request);
      }
      throw error;
    }
  }

  async function deleteRecords(key: Exclude<ListKey, "meta">, rows: Array<{ id: string }>) {
    const site = await resolveSite();
    const listId = requireList(key);
    await runPool(rows, async (row) => {
      const spId = itemIds[key].get(row.id);
      if (!spId) return;
      await write({ method: "DELETE", path: `/sites/${site}/lists/${listId}/items/${spId}` });
      itemIds[key].delete(row.id);
    });
  }

  async function upsertRecords(key: Exclude<ListKey, "meta">, before: Array<{ id: string; fields: Fields }>, after: Array<{ id: string; fields: Fields }>) {
    const site = await resolveSite();
    const listId = requireList(key);
    const beforeById = new Map(before.map((row) => [row.id, row]));
    const changed = after.filter((row) => {
      const previous = beforeById.get(row.id);
      return !previous || !sameFields(previous.fields, row.fields);
    });
    await runPool(changed, async (row) => {
      const previous = beforeById.get(row.id);
      if (!previous) {
        const created = await write({
          method: "POST",
          path: `/sites/${site}/lists/${listId}/items`,
          body: { fields: row.fields },
        });
        if (!created.id) throw new DomainError("SharePoint לא החזיר מזהה לפריט חדש", 502);
        itemIds[key].set(row.id, created.id);
        return;
      }
      const spId = itemIds[key].get(row.id);
      if (!spId) throw new DomainError(`הפריט ${row.id} חסר ברשימת SharePoint`, 500);
      await write({
        method: "PATCH",
        path: `/sites/${site}/lists/${listId}/items/${spId}/fields`,
        body: row.fields,
      });
    });
  }

  function taskRows(db: Db) {
    return db.templates.map((template) => ({ id: template.id, fields: templateToFields(template) }));
  }

  function eventRows(db: Db) {
    return db.events.map((event) => ({ id: event.id, fields: eventToFields(event) }));
  }

  function actionRows(db: Db) {
    return db.events.flatMap((event) => event.actions.map((action) => ({ id: action.id, fields: actionToFields(event.id, action) })));
  }

  async function writeDiff(before: Db, after: Db) {
    const beforeActions = actionRows(before);
    const afterActions = actionRows(after);
    const beforeEvents = eventRows(before);
    const afterEvents = eventRows(after);
    const beforeTasks = taskRows(before);
    const afterTasks = taskRows(after);
    const afterActionIds = new Set(afterActions.map((row) => row.id));
    const afterEventIds = new Set(afterEvents.map((row) => row.id));
    const afterTaskIds = new Set(afterTasks.map((row) => row.id));
    await deleteRecords("actions", beforeActions.filter((row) => !afterActionIds.has(row.id)));
    await deleteRecords("events", beforeEvents.filter((row) => !afterEventIds.has(row.id)));
    await deleteRecords("tasks", beforeTasks.filter((row) => !afterTaskIds.has(row.id)));
    await upsertRecords("tasks", beforeTasks, afterTasks);
    await upsertRecords("events", beforeEvents, afterEvents);
    await upsertRecords("actions", beforeActions, afterActions);
  }

  async function markInitialized() {
    if (itemIds.meta.has("initialized")) return;
    const site = await resolveSite();
    const created = await write({
      method: "POST",
      path: `/sites/${site}/lists/${requireList("meta")}/items`,
      body: { fields: { Title: "initialized", OpsAppId: "initialized", OpsMeta: "true" } },
    });
    if (created.id) itemIds.meta.set("initialized", created.id);
  }

  async function initialize(current: Db): Promise<Db> {
    const seed = createSeed();
    const hasAnything = current.templates.length > 0 || current.events.length > 0;
    const hasSeedMarker = current.templates.some((template) => template.id === "t01") || current.events.some((event) => event.id === "e-fire");
    let next = current;
    if (!hasAnything) {
      next = seed;
      await writeDiff(current, next);
    } else if (hasSeedMarker) {
      next = mergeMissing(current, seed);
      await writeDiff(current, next);
    }
    await markInitialized();
    return next;
  }

  return {
    async read(): Promise<Db> {
      await ensure();
      const loaded = await load();
      if (loaded.initialized) return loaded.db;
      return initialize(loaded.db);
    },
    async write(before: Db, after: Db): Promise<void> {
      await ensure();
      await writeDiff(before, after);
    },
  };
}

export type DataRepository = {
  read: () => Promise<Db>;
  write: (before: Db, after: Db) => Promise<void>;
};
