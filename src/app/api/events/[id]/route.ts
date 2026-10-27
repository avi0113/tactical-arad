import { fail, readJson, run } from "@/app/api/http";
import { applyEventDelete, applyEventPatch } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await readJson(request);
    return await run((db) => applyEventPatch(db, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await run((db) => applyEventDelete(db, id));
  } catch (error) {
    return fail(error);
  }
}
