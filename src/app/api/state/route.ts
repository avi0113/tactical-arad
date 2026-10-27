import { getState } from "@/app/api/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return getState();
}
