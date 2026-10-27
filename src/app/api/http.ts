import { DomainError } from "@/lib/domain";
import { readDb, resetDb, updateDb } from "@/lib/store";
import type { Db } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(error: unknown) {
  if (error instanceof DomainError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "שגיאה פנימית" }, 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DomainError("בקשה לא תקינה");
  }
}

export async function getState() {
  try {
    return json(await readDb());
  } catch (error) {
    return fail(error);
  }
}

export async function run(fn: (db: Db) => string | null) {
  try {
    const { db, value } = await updateDb(fn);
    return json({ ...db, resultId: value });
  } catch (error) {
    return fail(error);
  }
}

export async function resetState() {
  try {
    return json(await resetDb());
  } catch (error) {
    return fail(error);
  }
}
