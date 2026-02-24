import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
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
- Resume: props { title?, href } (use href "/arthur-zhuk-resume.pdf" when user asks for resume/CV)

Output ONLY valid JSON. No markdown, no code fences, no explanatory text.`;

function buildPrompt(prompt: string) {
  return `${systemPrompt}\n\nUser question: ${prompt}`;
}

export const runtime = "nodejs";

type IncomingMessagePart = {
  type?: string;
  text?: string;
};

type IncomingMessage = {
  role?: string;
  content?: string | IncomingMessagePart[];
  parts?: IncomingMessagePart[];
};

function extractMessageText(message: IncomingMessage) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }

  const contentText = Array.isArray(message.content)
    ? message.content
        .filter((part) => part?.type === "text" && typeof part.text === "string")
        .map((part) => part.text?.trim() ?? "")
        .filter(Boolean)
        .join("\n")
        .trim()
    : "";

  if (contentText) {
    return contentText;
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

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
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

    if (!resolvedPrompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      prompt: buildPrompt(resolvedPrompt),
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Generate error", error);
    return new NextResponse(JSON.stringify(buildSummaryTree()), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
