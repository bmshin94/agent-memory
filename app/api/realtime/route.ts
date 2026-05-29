import { handle } from "@upstash/realtime";
import { realtime } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

export const GET = handle({ realtime });
