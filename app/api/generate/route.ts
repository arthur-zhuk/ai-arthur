import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { profileData } from "@/lib/profile-data";
import { buildSummaryTree } from "@/lib/answer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function buildMessages(prompt: string): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `User question: ${prompt}

Write a concise answer (2-4 sentences) followed by a short list of evidence bullets if helpful.
If you need more info to answer, ask 1 clarifying question.`,
    },
  ];
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
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: buildMessages(prompt),
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate error", error);
    return NextResponse.json({ tree: buildSummaryTree() });
  }
}
