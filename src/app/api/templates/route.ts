import { fail, run, readJson } from "@/app/api/http";
import { applyTemplatePost } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return await run((db) => applyTemplatePost(db, body));
  } catch (error) {
    return fail(error);
  }
}
