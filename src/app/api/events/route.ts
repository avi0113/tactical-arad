import { fail, readJson, run } from "@/app/api/http";
import { applyEventPost } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return await run((db) => applyEventPost(db, body));
  } catch (error) {
    return fail(error);
  }
}
