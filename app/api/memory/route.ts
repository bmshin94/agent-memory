import { getRaw } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getRaw();
  return Response.json(
    { content, bytes: content.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
