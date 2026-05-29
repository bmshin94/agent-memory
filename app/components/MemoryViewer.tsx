"use client";

import { useEffect, useRef, useState } from "react";

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function MemoryViewer({
  content,
  size,
}: {
  content: string;
  size: number;
}) {
  const [flash, setFlash] = useState(false);
  const prev = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== content) {
      setFlash(false);
      requestAnimationFrame(() => setFlash(true));
      const t = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(t);
    }
    prev.current = content;
  }, [content]);

  useEffect(() => {
    prev.current = content;
  }, [content]);

  const lines = content.split("\n");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="font-mono text-[13px] text-zinc-900">MEMORY.md</span>
        <span className="font-mono text-[11px] text-zinc-300">{bytes(size)}</span>
      </div>
      <div
        ref={scroller}
        className={`flex-1 overflow-auto px-5 pb-5 ${flash ? "flash" : ""}`}
      >
        <pre className="font-mono text-[12.5px] leading-[1.7] text-zinc-700">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-5 w-5 shrink-0 select-none text-right text-zinc-200">
                {i + 1}
              </span>
              <span className="whitespace-pre-wrap break-words">
                {renderMd(line)}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function renderMd(line: string) {
  if (/^#{1,6}\s/.test(line)) {
    return <span className="font-semibold text-zinc-900">{line}</span>;
  }
  if (/^\s*>/.test(line)) {
    return <span className="text-zinc-500 italic">{line}</span>;
  }
  if (/^\s*[-*]\s/.test(line)) {
    const idx = line.indexOf("-") >= 0 ? line.indexOf("-") : line.indexOf("*");
    return (
      <>
        <span className="text-accent">{line.slice(0, idx + 1)}</span>
        <span>{line.slice(idx + 1)}</span>
      </>
    );
  }
  return <span>{line || " "}</span>;
}
