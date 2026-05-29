import { getOplog } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getOplog(50);
  return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}
