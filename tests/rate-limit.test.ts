import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import {
  createRateLimiter,
  memoryCounter,
  rateLimitConfigFromEnv,
  upstashCounter,
  visitorId,
} from "../lib/chat/rate-limit";
import { answerTree } from "../lib/chat/schema";
import { createChatHandler, systemPrompt } from "../lib/chat/server";
import { answer, user } from "./fixtures";

const from = (ip: string) =>
  new Request("http://test.local/api/generate", {
    method: "POST",
    headers: { "x-real-ip": ip },
    body: JSON.stringify({ messages: [user("Hello")] }),
  });
const config = { perMinute: 3, perDay: 5, siteDaily: 8 };

test("memory counter counts within a window and starts over once it ends", async () => {
  let time = 1_000;
  const counter = memoryCounter(() => time);
  assert.equal((await counter("k", 60)).count, 1);
  assert.equal((await counter("k", 60)).count, 2);
  assert.equal((await counter("other", 60)).count, 1);
  time += 61_000;
  assert.equal((await counter("k", 60)).count, 1);
});

test("limits a visitor per minute without affecting anyone else", async () => {
  const limiter = createRateLimiter({ config, counter: memoryCounter() });
  for (let index = 0; index < 3; index++)
    assert.deepEqual(await limiter.check(from("1.1.1.1")), { ok: true });
  const blocked = await limiter.check(from("1.1.1.1"));
  assert.equal(blocked.ok, false);
  assert.ok(!blocked.ok && blocked.scope === "visitor" && blocked.retryAfter > 0);
  assert.deepEqual(await limiter.check(from("2.2.2.2")), { ok: true });
});

test("a site-wide daily budget stops many different visitors", async () => {
  const limiter = createRateLimiter({ config, counter: memoryCounter() });
  for (let index = 0; index < 8; index++)
    assert.deepEqual(await limiter.check(from(`10.0.0.${index}`)), { ok: true });
  const blocked = await limiter.check(from("10.0.0.99"));
  assert.ok(!blocked.ok && blocked.scope === "site");
});

test("visitors are hashed, prefer platform headers, and never store the address", () => {
  const id = visitorId(
    new Request("http://test.local", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      },
    }),
  );
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(
    id,
    visitorId(
      new Request("http://test.local", {
        headers: { "x-real-ip": "203.0.113.9" },
      }),
    ),
  );
  assert.notEqual(id, visitorId(from("203.0.113.10")));
});

test("shared store replies are read, and an outage falls back to the local counter", async () => {
  const replies = [{ result: 4 }, { result: 0 }, { result: 42 }];
  const shared = upstashCounter("https://store.example/", "token", async (url, init) => {
    assert.equal(String(url), "https://store.example/pipeline");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer token",
    );
    return Response.json(replies);
  });
  assert.deepEqual(await shared("k", 60), { count: 4, resetIn: 42 });

  const original = console.error;
  console.error = () => {};
  try {
    const limiter = createRateLimiter({
      config,
      counter: async () => {
        throw new Error("store down");
      },
      fallback: memoryCounter(),
    });
    for (let index = 0; index < 3; index++)
      assert.equal((await limiter.check(from("3.3.3.3"))).ok, true);
    assert.equal((await limiter.check(from("3.3.3.3"))).ok, false);
  } finally {
    console.error = original;
  }
});

test("environment limits are parsed defensively", () => {
  assert.deepEqual(
    rateLimitConfigFromEnv({
      CHAT_RATE_LIMIT_PER_MINUTE: "2",
      CHAT_RATE_LIMIT_PER_DAY: "not a number",
      CHAT_DAILY_BUDGET: "-5",
    }),
    { perMinute: 2, perDay: 60, siteDaily: 1500 },
  );
});

test("a limited request gets a 429 with Retry-After and never reaches the provider", async () => {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: [] }),
    }),
  });
  const handler = createChatHandler({
    model,
    hasApiKey: () => true,
    rateLimiter: {
      check: async () => ({ ok: false, scope: "visitor", retryAfter: 17 }),
    },
  });
  const response = await handler(from("4.4.4.4"));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "17");
  assert.match(await response.text(), /wait a moment/);
  assert.equal(model.doStreamCalls.length, 0);
});

test("job descriptions get an honest fit assessment, and booking is opt-in", () => {
  assert.match(systemPrompt, /JOB FIT/);
  assert.match(systemPrompt, /Never invent experience/);
  assert.match(systemPrompt, /no scheduling link/);
  const hrefs = Object.values(
    answerTree({ ...answer, links: ["booking", "email"] }).elements,
  ).flatMap((element) =>
    typeof element.props.href === "string" ? [element.props.href] : [],
  );
  assert.deepEqual(hrefs, ["mailto:arthurzhuk@gmail.com"]);
});
