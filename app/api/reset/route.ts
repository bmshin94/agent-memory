import { resetMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function POST() {
  const msg = await resetMemory();
  return Response.json({ ok: true, msg }, { headers: { "Cache-Control": "no-store" } });
}
