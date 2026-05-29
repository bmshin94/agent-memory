import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  type InferUITools,
  stepCountIs,
  streamText,
  tool,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  appendMemory,
  editMemory,
  FILE_NAME,
  grepMemory,
  readMemory,
  writeMemory,
} from "@/lib/memory";

export const maxDuration = 60;

const tools = {
  read_memory: tool({
    description:
      `Read the full contents of ${FILE_NAME}, your long-term memory file. ` +
      `Always do this at the start of a conversation before answering, and again ` +
      `before editing so you have the exact current text.`,
    inputSchema: z.object({
      lineNumbers: z
        .boolean()
        .optional()
        .describe("Prefix each line with its line number (useful before editing)."),
    }),
    execute: async ({ lineNumbers }) => readMemory({ lineNumbers }),
  }),

  grep_memory: tool({
    description:
      `Search ${FILE_NAME} for lines matching a regular expression (or plain text). ` +
      `Returns matching lines with their line numbers. Cheaper than reading the whole file.`,
    inputSchema: z.object({
      pattern: z.string().describe("Regex or literal text to search for."),
      ignoreCase: z.boolean().optional().describe("Case-insensitive match."),
    }),
    execute: async ({ pattern, ignoreCase }) => grepMemory(pattern, { ignoreCase }),
  }),

  write_memory: tool({
    description:
      `Overwrite the ENTIRE ${FILE_NAME} with new content. Use this for big ` +
      `restructures. For small changes prefer edit_memory or append_memory so you ` +
      `don't lose existing notes.`,
    inputSchema: z.object({
      content: z.string().describe("The complete new contents of the file."),
    }),
    execute: async ({ content }) => writeMemory(content),
  }),

  append_memory: tool({
    description:
      `Append a block of text to the end of ${FILE_NAME}. Good for jotting a new ` +
      `fact without rewriting the file.`,
    inputSchema: z.object({
      text: z.string().describe("Markdown text to append."),
    }),
    execute: async ({ text }) => appendMemory(text),
  }),

  edit_memory: tool({
    description:
      `Find-and-replace a unique snippet inside ${FILE_NAME}. The oldString must ` +
      `match the file exactly (read it first). Use this to update a single fact ` +
      `under the right heading.`,
    inputSchema: z.object({
      oldString: z.string().describe("Exact text to replace (must be unique unless replaceAll)."),
      newString: z.string().describe("Replacement text."),
      replaceAll: z.boolean().optional().describe("Replace every occurrence."),
    }),
    execute: async ({ oldString, newString, replaceAll }) =>
      editMemory(oldString, newString, replaceAll),
  }),
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

const SYSTEM = `You are a helpful assistant with a persistent long-term memory stored in a single file called ${FILE_NAME}.

How to use your memory:
- At the START of every conversation, call read_memory once to load what you already know about this user.
- When the user tells you something durable about themselves — their name, role, preferences, ongoing projects, important facts — record it in ${FILE_NAME} using edit_memory (to update an existing line) or append_memory (for something new). Put it under the most fitting heading (## User, ## Preferences, ## Projects, ## Facts), adding a heading if needed.
- Keep memory concise: one fact per bullet, no duplication. If a fact changes, edit the existing bullet rather than adding a contradictory one.
- Don't store secrets, passwords, or sensitive personal data.
- Use grep_memory to quickly check whether you already know something instead of re-reading the whole file.

Be transparent and natural: briefly mention when you've saved or recalled something, but don't be robotic about it. The user is watching your memory file update live, so make your writes clean and well-organized.`;

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
