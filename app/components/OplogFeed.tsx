"use client";

export interface OplogEntry {
  id: string;
  ts: number;
  op: "read" | "write" | "append" | "edit" | "grep" | "reset";
  summary: string;
  bytes: number;
}

const OP: Record<OplogEntry["op"], { verb: string; mutating: boolean }> = {
  read: { verb: "read", mutating: false },
  grep: { verb: "search", mutating: false },
  write: { verb: "write", mutating: true },
  append: { verb: "append", mutating: true },
  edit: { verb: "edit", mutating: true },
  reset: { verb: "clear", mutating: true },
};

function clock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export function OplogFeed({ entries }: { entries: OplogEntry[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="px-5 pt-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-300">
        Redis activity
      </div>
      <div className="flex-1 overflow-auto px-5 pb-4">
        {entries.length === 0 ? (
          <div className="py-2 text-[13px] text-zinc-300">
            Nothing yet.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => {
              const op = OP[e.op];
              return (
                <li
                  key={e.id}
                  className="rowin flex items-baseline gap-3 font-mono text-[12px]"
                >
                  <span className="w-[58px] shrink-0 tabular-nums text-zinc-400">
                    {clock(e.ts)}
                  </span>
                  <span
                    className={`w-[52px] shrink-0 ${
                      op.mutating ? "text-zinc-800" : "text-zinc-500"
                    }`}
                  >
                    {op.verb}
                  </span>
                  <span className="truncate text-zinc-500">{e.summary}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
