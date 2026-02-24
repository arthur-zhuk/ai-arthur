import { NextResponse } from "next/server";
import WebSocket from "ws";
import { profileData } from "@/lib/profile-data";
import { buildSummaryTree } from "@/lib/answer";

const profileContext = JSON.stringify(profileData, null, 2);

const COMPONENTS =
  "Card, Text, Heading, List, ListItem, TagRow, Tag, Divider, Link, Resume, InterestGrid, Counter";

const systemPrompt = `You are an assistant that answers questions about Arthur Zhuk.
Use only the provided profile data. Be specific and concrete. Avoid generic hiring
fluff or templated language. If asked about fit for a team, answer directly with
clear reasons tied to the resume and mention any missing info you'd want.

If asked about "preferred tech stack", interpret it as the technologies Arthur
uses most often and leads with, and cite the specific skills and roles that show it.
If the question asks for preferences not stated, infer only from the resume and
say "based on his experience" rather than guessing.

PROFILE DATA:
${profileContext}

Respond with a JSON spec using this flat format: { "root": "<key>", "elements": { "<key>": { "key": "<key>", "type": "<Component>", "props": {...}, "children": [], "parentKey": "<parent-key>" } } }
Available components: ${COMPONENTS}
- Card: props { title?, subtitle? }, children
- Text: props { content, variant? }
- Heading: props { text, level? }
- List: children are ListItem
- ListItem: props { content, meta?, href? }
- TagRow: children are Tag
- Tag: props { text }
- Divider: props { label? }
- Link: props { label, href }

Output ONLY valid JSON. No markdown, no code fences, no explanatory text.`;

function buildPrompt(prompt: string) {
  return `${systemPrompt}\n\nUser question: ${prompt}`;
}

export const runtime = "nodejs";

type PendingRequest = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  responseId?: string;
  closed: boolean;
};

type OpenAIEvent = {
  type?: string;
  response_id?: string;
  response?: { id?: string };
  delta?: string;
  error?: { message?: string };
  message?: string;
};

type IncomingMessagePart = {
  type?: string;
  text?: string;
};

type IncomingMessage = {
  role?: string;
  content?: string;
  parts?: IncomingMessagePart[];
};

const encoder = new TextEncoder();
let sharedSocket: WebSocket | null = null;
let socketConnectPromise: Promise<WebSocket> | null = null;
const pendingWithoutId: PendingRequest[] = [];
const pendingByResponseId = new Map<string, PendingRequest>();

function extractMessageText(message: IncomingMessage) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }

  if (Array.isArray(message.parts)) {
    const textFromParts = message.parts
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (textFromParts) {
      return textFromParts;
    }
  }

  return "";
}

function clearPendingRequest(pending: PendingRequest) {
  pending.closed = true;
  if (pending.responseId) {
    pendingByResponseId.delete(pending.responseId);
  } else {
    const idx = pendingWithoutId.indexOf(pending);
    if (idx >= 0) {
      pendingWithoutId.splice(idx, 1);
    }
  }
}

function failPendingRequest(pending: PendingRequest, errorMessage: string) {
  if (pending.closed) {
    return;
  }

  pending.controller.error(new Error(errorMessage));
  clearPendingRequest(pending);
}

function failAllPending(errorMessage: string) {
  while (pendingWithoutId.length) {
    const pending = pendingWithoutId.shift();
    if (pending && !pending.closed) {
      pending.controller.error(new Error(errorMessage));
      pending.closed = true;
    }
  }

  for (const pending of pendingByResponseId.values()) {
    if (!pending.closed) {
      pending.controller.error(new Error(errorMessage));
      pending.closed = true;
    }
  }

  pendingByResponseId.clear();
}

function resolvePendingFromEvent(event: OpenAIEvent) {
  if (event.type === "response.created" && event.response?.id) {
    const pending = pendingWithoutId.shift();
    if (pending && !pending.closed) {
      pending.responseId = event.response.id;
      pendingByResponseId.set(event.response.id, pending);
    }
  }

  const responseId = event.response_id ?? event.response?.id;
  if (!responseId) {
    if (event.type === "error") {
      return pendingWithoutId[0] ?? null;
    }
    return null;
  }

  return pendingByResponseId.get(responseId) ?? null;
}

function handleSocketEvent(rawData: WebSocket.RawData) {
  let event: OpenAIEvent;
  try {
    event = JSON.parse(rawData.toString()) as OpenAIEvent;
  } catch (error) {
    console.error("Failed to parse OpenAI WebSocket event", error);
    return;
  }

  const pending = resolvePendingFromEvent(event);
  if (!pending || pending.closed) {
    return;
  }

  if (event.type === "response.output_text.delta") {
    pending.controller.enqueue(encoder.encode(event.delta ?? ""));
    return;
  }

  if (event.type === "response.completed" || event.type === "response.done") {
    pending.controller.close();
    clearPendingRequest(pending);
    return;
  }

  if (event.type === "error" || event.type === "response.failed") {
    const message =
      event.error?.message ?? event.message ?? "OpenAI WebSocket request failed";
    failPendingRequest(pending, message);
  }
}

async function getSharedSocket(apiKey: string) {
  if (sharedSocket && sharedSocket.readyState === WebSocket.OPEN) {
    return sharedSocket;
  }

  if (socketConnectPromise) {
    return socketConnectPromise;
  }

  socketConnectPromise = new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket("wss://api.openai.com/v1/responses", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    socket.once("open", () => {
      sharedSocket = socket;
      resolve(socket);
    });

    socket.on("message", handleSocketEvent);

    socket.on("error", (error: Error) => {
      console.error("OpenAI WebSocket error", error);
      failAllPending("OpenAI WebSocket connection error");
    });

    socket.on("close", () => {
      sharedSocket = null;
      socketConnectPromise = null;
      failAllPending("OpenAI WebSocket connection closed");
    });

    socket.once("error", (error: Error) => {
      socketConnectPromise = null;
      reject(error);
    });
  });

  try {
    return await socketConnectPromise;
  } catch (error) {
    socketConnectPromise = null;
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const messages = Array.isArray(body?.messages)
      ? (body.messages as IncomingMessage[])
      : [];
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const lastUserMessageText = lastUserMessage
      ? extractMessageText(lastUserMessage)
      : "";
    const resolvedPrompt = prompt || lastUserMessageText;

    console.debug("generate: resolved prompt", {
      hasPromptField: Boolean(prompt),
      messageCount: messages.length,
      hasLastUserMessage: Boolean(lastUserMessage),
      resolvedPromptLength: resolvedPrompt.length,
    });

    if (!resolvedPrompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const socket = await getSharedSocket(process.env.OPENAI_API_KEY);
    const inputText = buildPrompt(resolvedPrompt);
    const input = [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: inputText }],
      },
    ];

    let currentPending: PendingRequest | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const pending: PendingRequest = { controller, closed: false };
        currentPending = pending;
        pendingWithoutId.push(pending);

        try {
          console.debug("generate: sending websocket response.create", {
            model: "gpt-4o-mini",
            inputMessageCount: input.length,
            inputTextLength: inputText.length,
          });
          socket.send(
            JSON.stringify({
              type: "response.create",
              response: {
                model: "gpt-4o-mini",
                input,
              },
            }),
          );
        } catch (error) {
          console.error("Failed to send response.create", error);
          failPendingRequest(pending, "Failed to send request to OpenAI");
        }
      },
      cancel() {
        if (!currentPending || currentPending.closed) {
          return;
        }

        const responseId = currentPending.responseId;
        clearPendingRequest(currentPending);

        if (responseId && socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(
              JSON.stringify({
                type: "response.cancel",
                response_id: responseId,
              }),
            );
          } catch {
            // Ignore send failures on cancel cleanup.
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Generate error", error);
    return new NextResponse(JSON.stringify(buildSummaryTree()), {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
