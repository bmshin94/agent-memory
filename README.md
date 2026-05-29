# MEMORY.md, a Redis-backed agent memory you can watch live

An [AI SDK](https://ai-sdk.dev) agent whose entire long-term memory is **one
Markdown file, `MEMORY.md`**. The agent reads it, greps it, and writes to it with
ordinary file-style tools. The "file" is virtual and lives in
[Upstash Redis](https://upstash.com). 

Memory model inspired by <https://docs.openclaw.ai/concepts/memory>.

## How it works

```
┌──────────────┐   tools     ┌──────────────┐   string key   ┌─────────────┐
│  Claude      │ ──────────▶ │ lib/memory.ts│ ─────────────▶ │   Upstash   │
│ (AI SDK)     │  read/grep  │  read/write  │  memory:MEMORY │    Redis    │
│              │  write/edit │  edit/grep   │  memory:oplog  │             │
└──────────────┘             └──────────────┘                └─────────────┘
```

## Run it

1. Add your Anthropic key and Upstash Redis credentials to `.env`:

   ```
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Start it:

   ```bash
   bun dev
   ```

   Open <http://localhost:3000>.

3. Tell the agent something about yourself ("I'm Josh, I prefer TypeScript") and
   watch it write to `MEMORY.md` on the right. Ask "what do you remember?" in a
   fresh message and it reads the file back. **Reset demo** wipes it between takes.
