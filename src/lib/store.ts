import { createGraphClient } from "./sharepoint/graph";
import { loadSharePointSettings } from "./sharepoint/config";
import { createSharePointRepository, type DataRepository } from "./sharepoint/repository";
import { createSeed } from "./seed";
import type { Db } from "./types";

let override: DataRepository | null = null;
let cached: DataRepository | null = null;
let queue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function useRepository(repository: DataRepository | null) {
  override = repository;
  if (repository) cached = null;
}

function repository(): DataRepository {
  if (override) return override;
  if (!cached) {
    const settings = loadSharePointSettings();
    cached = createSharePointRepository(createGraphClient(settings.auth), {
      siteId: settings.siteId,
      siteUrl: settings.siteUrl,
      lists: settings.lists,
    });
  }
  return cached;
}

export function readDb(): Promise<Db> {
  return withLock(async () => structuredClone(await repository().read()));
}

export function updateDb<T>(fn: (db: Db) => T): Promise<{ db: Db; value: T }> {
  return withLock(async () => {
    const db = await repository().read();
    const before = structuredClone(db);
    const value = fn(db);
    await repository().write(before, db);
    return { db: structuredClone(db), value };
  });
}

export async function resetDb(): Promise<Db> {
  const { db } = await updateDb((draft) => {
    const fresh = createSeed();
    draft.templates = fresh.templates;
    draft.events = fresh.events;
    return null;
  });
  return db;
}
