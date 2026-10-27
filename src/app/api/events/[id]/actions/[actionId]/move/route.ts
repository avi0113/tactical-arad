import { fail, readJson, run } from "@/app/api/http";
import { applyActionMove } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; actionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id, actionId } = await context.params;
    const body = await readJson(request);
    return await run((db) => applyActionMove(db, id, actionId, body));
  } catch (error) {
    return fail(error);
  }
}
