import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "./domain";
import { createSeed } from "./seed";
import type { Db } from "./types";

function dbFile(): string {
  return process.env.OPS_DB_PATH ?? path.join(process.cwd(), "data", "db.json");
}

let queue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isDb(value: unknown): value is Db {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Db>;
  return Array.isArray(record.templates) && Array.isArray(record.events);
}

async function persist(db: Db): Promise<void> {
  const file = dbFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, file);
}

async function loadOrSeed(): Promise<Db> {
  const file = dbFile();
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const seeded = createSeed();
      await persist(seeded);
      return seeded;
    }
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DomainError("קובץ הנתונים פגום", 500);
  }
  if (!isDb(parsed)) throw new DomainError("קובץ הנתונים פגום", 500);
  return parsed;
}

export function readDb(): Promise<Db> {
  return withLock(async () => structuredClone(await loadOrSeed()));
}

export function updateDb<T>(fn: (db: Db) => T): Promise<{ db: Db; value: T }> {
  return withLock(async () => {
    const db = await loadOrSeed();
    const value = fn(db);
    await persist(db);
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
