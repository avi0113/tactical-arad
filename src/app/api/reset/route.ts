import { resetState } from "@/app/api/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST() {
  return resetState();
}
