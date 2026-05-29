"use client"

import { useChat } from "@ai-sdk/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai"
import { useEffect, useRef, useState } from "react"
import { Streamdown } from "streamdown"
import { useRealtime } from "@/lib/realtime-client"
import { MemoryViewer } from "./components/MemoryViewer"
import { OplogFeed, type OplogEntry } from "./components/OplogFeed"
import { ToolCall } from "./components/ToolCall"

const SUGGESTIONS = [
  "Hi! I'm Josh, a founder working on a Redis demo.",
  "I prefer TypeScript and dark mode.",
  "What do you remember about me?",
  "Actually, I switched from Redis to Postgres.",
]

interface Memory {
  content: string
  bytes: number
}

const fetchMemory = (): Promise<Memory> =>
  fetch("/api/memory", { cache: "no-store" }).then((r) => r.json())

const fetchOplog = (): Promise<OplogEntry[]> =>
  fetch("/api/oplog", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => d.entries as OplogEntry[])

export default function Home() {
  const queryClient = useQueryClient()

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const [input, setInput] = useState("")
  const busy = status === "submitted" || status === "streaming"

  const { data: memory } = useQuery({
    queryKey: ["memory"],
    queryFn: fetchMemory,
    initialData: { content: "", bytes: 0 },
  })

  const { data: oplog } = useQuery({
    queryKey: ["oplog"],
    queryFn: fetchOplog,
    initialData: [],
  })

  useRealtime({
    events: ["memory.changed", "oplog.appended"],
    onData({ event, data }) {
      if (event === "memory.changed") {
        queryClient.setQueryData<Memory>(["memory"], {
          content: data.content,
          bytes: data.bytes,
        })
      } else if (event === "oplog.appended") {
        queryClient.setQueryData<OplogEntry[]>(["oplog"], (prev = []) =>
          prev.some((e) => e.id === data.id) ? prev : [data, ...prev].slice(0, 50),
        )
      }
    },
  })

  const reset = useMutation({
    mutationFn: () => fetch("/api/reset", { method: "POST" }),
    onSuccess: () => {
      setMessages([])
      queryClient.invalidateQueries({ queryKey: ["memory"] })
      queryClient.invalidateQueries({ queryKey: ["oplog"] })
    },
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, status])

  const send = (text: string) => {
    if (!text.trim() || busy) return
    sendMessage({ parts: [{ type: "text", text }] })
    setInput("")
  }

  return (
    <div className="flex h-screen flex-col bg-[#fcfcfc] text-zinc-900">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-[15px] font-medium tracking-tight">MEMORY.md</h1>
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => reset.mutate()}
            className="text-[13px] text-zinc-400 transition hover:text-zinc-900"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-8 pb-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col">
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-auto pr-1">
            {messages.length === 0 && (
              <div className="max-w-sm pt-10">
                <p className="text-[15px] leading-relaxed text-zinc-500">
                  Durable memory in pure markdown. A format agents already read, search,
                  grep and edit natively.
                </p>
                <div className="mt-7 flex flex-col items-start gap-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-[14px] text-zinc-500 underline-offset-4 transition hover:text-accent hover:underline"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5">
                <div
                  className={`text-[11px] font-medium uppercase tracking-wider ${
                    m.role === "user" ? "text-zinc-300" : "text-accent"
                  }`}
                >
                  {m.role === "user" ? "you" : "agent"}
                </div>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <p
                        key={i}
                        className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-zinc-800"
                      >
                        {part.text}
                      </p>
                    ) : (
                      <Streamdown
                        key={i}
                        className="text-[14.5px] leading-relaxed text-zinc-800 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-200 [&_:where(h1,h2,h3)]:font-semibold [&_:where(h1,h2,h3)]:tracking-tight"
                      >
                        {part.text}
                      </Streamdown>
                    )
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <ToolCall
                        key={i}
                        name={getToolName(part) as string}
                        state={part.state}
                        input={part.input}
                        output={part.output}
                        errorText={part.errorText}
                      />
                    )
                  }
                  return null
                })}
              </div>
            ))}

            {status === "submitted" && (
              <div className="text-[13px] text-zinc-400">
                <span className="blink">thinking…</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 transition focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/[0.07]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell the agent something…"
                className="flex-1 bg-transparent text-[14.5px] text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white transition enabled:hover:bg-accent/90 disabled:opacity-30"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2.5 8h10M8.5 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
        </section>

        <section className="grid min-h-0 grid-rows-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
          <MemoryViewer content={memory.content} size={memory.bytes} />
          <OplogFeed entries={oplog} />
        </section>
      </main>
    </div>
  )
}
