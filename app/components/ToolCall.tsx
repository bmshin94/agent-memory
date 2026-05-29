"use client";

import { useState } from "react";

const TOOL_META: Record<string, { label: string; mutating: boolean }> = {
  read_memory: { label: "read", mutating: false },
  grep_memory: { label: "searched", mutating: false },
  write_memory: { label: "wrote to", mutating: true },
  append_memory: { label: "appended to", mutating: true },
  edit_memory: { label: "edited", mutating: true },
};

type State =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

export function ToolCall({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: State;
  input: unknown;
  output: unknown;
  errorText?: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[name] ?? { label: name, mutating: false };

  const running = state.startsWith("input") || state.startsWith("approval");
  const failed = state === "output-error" || state === "output-denied";

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-baseline gap-2 text-left font-mono text-[12px]"
      >
        <span
          className={`h-1 w-1 shrink-0 translate-y-[-1px] rounded-full ${
            meta.mutating ? "bg-accent" : "bg-zinc-300"
          }`}
        />
        <span className={meta.mutating ? "text-zinc-700" : "text-zinc-500"}>
          {meta.label} MEMORY.md
        </span>
        {running && <span className="blink text-zinc-400">…</span>}
        {failed && <span className="text-rose-500">error</span>}
        <span className="text-zinc-300 opacity-0 transition group-hover:opacity-100">
          {open ? "hide" : "view"}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-3">
          {input != null && <Block label="input" value={input} />}
          {failed ? (
            <Block label="error" value={errorText ?? "unknown error"} mono />
          ) : output != null ? (
            <Block label="output" value={output} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  value,
  mono,
}: {
  label: string;
  value: unknown;
  mono?: boolean;
}) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <pre
        className={`max-h-48 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[11.5px] leading-snug text-zinc-700 ${
          mono ? "text-rose-500" : ""
        }`}
      >
        {text}
      </pre>
    </div>
  );
}
