import { fail, readJson, run } from "@/app/api/http";
import { applyActionsPost } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await readJson(request);
    return await run((db) => applyActionsPost(db, id, body));
  } catch (error) {
    return fail(error);
  }
}
