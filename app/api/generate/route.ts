import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { profileData } from "@/lib/profile-data";
import { buildSummaryTree } from "@/lib/answer";

const profileContext = JSON.stringify(profileData, null, 2);

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
`;

function buildPrompt(prompt: string) {
  return `${systemPrompt}\n\nUser question: ${prompt}\n\nWrite a concise answer (2-4 sentences) followed by a short list of evidence bullets if helpful.\nIf you need more info to answer, ask 1 clarifying question.`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMessage = [...messages]
      .reverse()
      .find((message: { role?: string; content?: string }) => message.role === "user");
    const resolvedPrompt = prompt || (lastUserMessage?.content ?? "").trim();

    if (!resolvedPrompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await streamText({
      model: openai("gpt-5-nano"),
      prompt: buildPrompt(resolvedPrompt),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Generate error", error);
    return NextResponse.json({ tree: buildSummaryTree() });
  }
}
