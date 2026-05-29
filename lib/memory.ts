import { redis } from "./redis";
import { realtime } from "./realtime";

const FILE_KEY = "memory:MEMORY.md";
const OPLOG_KEY = "memory:oplog";
const OPLOG_MAX = 200;

export const FILE_NAME = "MEMORY.md";

const SEED = `# MEMORY.md

> This is my long-term memory. I read it at the start of a conversation and write durable facts here so I don't forget them between sessions. It is stored in Upstash Redis but behaves like a virtual Markdown file.

## User

## Preferences

## Projects

## Facts
`;

export type Op =
  | "read"
  | "write"
  | "append"
  | "edit"
  | "grep"
  | "reset";

export interface OplogEntry {
  id: string;
  ts: number;
  op: Op;
  summary: string;
  bytes: number;
}

async function record(op: Op, summary: string, bytes: number): Promise<void> {
  const entry: OplogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    op,
    summary,
    bytes,
  };
  await redis.lpush(OPLOG_KEY, JSON.stringify(entry));
  await redis.ltrim(OPLOG_KEY, 0, OPLOG_MAX - 1);
  await realtime.emit("oplog.appended", entry);
}

async function emitChanged(content: string): Promise<void> {
  await realtime.emit("memory.changed", { content, bytes: content.length });
}

export async function getRaw(): Promise<string> {
  const value = await redis.get<string>(FILE_KEY);
  if (value == null) {
    await redis.set(FILE_KEY, SEED);
    return SEED;
  }
  return value;
}

export async function getOplog(limit = 50): Promise<OplogEntry[]> {
  const rows = await redis.lrange<string | OplogEntry>(OPLOG_KEY, 0, limit - 1);
  return rows.map((r) => (typeof r === "string" ? (JSON.parse(r) as OplogEntry) : r));
}

function withLineNumbers(content: string): string {
  const lines = content.split("\n");
  const width = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(width, " ")}\t${line}`)
    .join("\n");
}

export async function readMemory(opts?: { lineNumbers?: boolean }): Promise<string> {
  const content = await getRaw();
  await record("read", `read ${FILE_NAME} (${content.length} bytes)`, content.length);
  return opts?.lineNumbers ? withLineNumbers(content) : content;
}

export async function writeMemory(content: string): Promise<string> {
  await redis.set(FILE_KEY, content);
  await emitChanged(content);
  await record("write", `overwrote ${FILE_NAME} (${content.length} bytes)`, content.length);
  return `Wrote ${content.length} bytes to ${FILE_NAME}.`;
}

export async function appendMemory(text: string): Promise<string> {
  const current = await getRaw();
  const sep = current.endsWith("\n") || current.length === 0 ? "" : "\n";
  const next = current + sep + text + (text.endsWith("\n") ? "" : "\n");
  await redis.set(FILE_KEY, next);
  await emitChanged(next);
  await record("append", `appended ${text.length} bytes to ${FILE_NAME}`, next.length);
  return `Appended ${text.length} bytes to ${FILE_NAME}.`;
}

export async function editMemory(
  oldString: string,
  newString: string,
  replaceAll = false,
): Promise<string> {
  const current = await getRaw();

  if (oldString === newString) {
    throw new Error("oldString and newString are identical — nothing to change.");
  }

  const occurrences = current.split(oldString).length - 1;
  if (occurrences === 0) {
    throw new Error(
      `oldString not found in ${FILE_NAME}. Read the file first to copy the exact text.`,
    );
  }
  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `oldString appears ${occurrences} times. Pass replaceAll:true or include more surrounding context to make it unique.`,
    );
  }

  const next = replaceAll
    ? current.split(oldString).join(newString)
    : current.replace(oldString, newString);

  await redis.set(FILE_KEY, next);
  await emitChanged(next);
  await record(
    "edit",
    `edited ${FILE_NAME} (${occurrences} replacement${occurrences === 1 ? "" : "s"})`,
    next.length,
  );
  return `Replaced ${occurrences} occurrence${occurrences === 1 ? "" : "s"} in ${FILE_NAME}.`;
}

export interface GrepMatch {
  line: number;
  text: string;
}

export async function grepMemory(
  pattern: string,
  opts?: { ignoreCase?: boolean },
): Promise<{ matches: GrepMatch[]; count: number }> {
  const content = await getRaw();
  let re: RegExp;
  try {
    re = new RegExp(pattern, opts?.ignoreCase ? "i" : "");
  } catch {
    const flags = opts?.ignoreCase ? "i" : "";
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  }

  const matches: GrepMatch[] = [];
  content.split("\n").forEach((text, i) => {
    if (re.test(text)) matches.push({ line: i + 1, text });
  });

  await record("grep", `grep /${pattern}/ → ${matches.length} match(es)`, content.length);
  return { matches, count: matches.length };
}

export async function resetMemory(): Promise<string> {
  await redis.set(FILE_KEY, SEED);
  await redis.del(OPLOG_KEY);
  await emitChanged(SEED);
  await record("reset", `reset ${FILE_NAME} to seed`, SEED.length);
  return `Reset ${FILE_NAME}.`;
}
