import { fail, readJson, run } from "@/app/api/http";
import { applyActionDelete, applyActionPatch } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; actionId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, actionId } = await context.params;
    const body = await readJson(request);
    return await run((db) => applyActionPatch(db, id, actionId, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id, actionId } = await context.params;
    return await run((db) => applyActionDelete(db, id, actionId));
  } catch (error) {
    return fail(error);
  }
}
