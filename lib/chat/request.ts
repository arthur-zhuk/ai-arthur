import { z } from "zod";
import type { ModelMessage } from "ai";
import {
  answerDataSchema,
  answerText,
  MAX_INPUT_LENGTH,
  MAX_QUESTIONS,
} from "./schema";

export const MAX_REQUEST_BYTES = 180_000;
const MAX_CONTEXT_CHARS = 24_000;
const partSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(MAX_INPUT_LENGTH) }),
  z.object({ type: z.literal("data-answer"), data: answerDataSchema }),
  z.object({ type: z.literal("step-start") }),
]);
const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        parts: z.array(partSchema).min(1).max(4),
      }),
    )
    .min(1)
    .max(MAX_QUESTIONS * 2),
});
export class ChatRequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readChatRequest(req: Request): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new ChatRequestError("Enter a question to start.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ChatRequestError(
          "This conversation is too long. Start a new one.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ChatRequestError(
      "The request could not be read. Please try again.",
    );
  }
}
export function conversationMessages(body: unknown): ModelMessage[] {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    throw new ChatRequestError(
      "Send a valid conversation with questions under 4,000 characters.",
    );
  const incoming = parsed.data.messages;
  if (incoming.at(-1)?.role !== "user")
    throw new ChatRequestError("The conversation must end with a question.");
  if (
    incoming.filter((message) => message.role === "user").length > MAX_QUESTIONS
  )
    throw new ChatRequestError("Please start a new conversation.");
  const messages: ModelMessage[] = [];
  for (const message of incoming) {
    if (message.role === "user") {
      if (message.parts.some((part) => part.type !== "text"))
        throw new ChatRequestError("Questions must contain text only.");
      const content = message.parts
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("\n")
        .trim();
      if (!content || content.length > MAX_INPUT_LENGTH)
        throw new ChatRequestError(
          "Enter a question between 1 and 4,000 characters.",
        );
      messages.push({ role: "user", content });
    } else {
      const answer = message.parts.find(
        (part) => part.type === "data-answer" && part.data.complete,
      );
      // Partial/cancelled answers are not authoritative conversation context.
      if (answer?.type === "data-answer" && answer.data.complete) {
        messages.push({
          role: "assistant",
          content: answerText(answer.data.answer),
        });
      }
    }
  }
  let chars = 0;
  let first = messages.length - 1;
  for (let index = messages.length - 1; index >= 0; index--) {
    const length = (messages[index].content as string).length;
    if (chars + length > MAX_CONTEXT_CHARS) break;
    chars += length;
    first = index;
  }
  while (messages[first]?.role === "assistant") first++;
  return messages.slice(first);
}
