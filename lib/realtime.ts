import { Realtime, type InferRealtimeEvents } from "@upstash/realtime";
import z from "zod/v4";
import { redis } from "./redis";

const schema = {
  memory: {
    changed: z.object({
      content: z.string(),
      bytes: z.number(),
    }),
  },
  oplog: {
    appended: z.object({
      id: z.string(),
      ts: z.number(),
      op: z.enum(["read", "write", "append", "edit", "grep", "reset"]),
      summary: z.string(),
      bytes: z.number(),
    }),
  },
};

export const realtime = new Realtime({ schema, redis });
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
