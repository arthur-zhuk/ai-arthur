import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { chromium } from "playwright";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { createChatHandler } from "../../lib/chat/server";
import { answer } from "../fixtures";

const url = process.env.CHAT_TEST_URL ?? "http://127.0.0.1:3002";

test(
  "chat UI: recover from error, follow up, cancel, reset, and use mobile layout",
  { timeout: 60_000 },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const requests: {
      messages: { role: string; parts: { type: string }[] }[];
    }[] = [];
    let fail = true;
    let hold = false;
    let release: () => void = () => {};
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 0,
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text" },
            { type: "text-delta", id: "text", delta: JSON.stringify(answer) },
            { type: "text-end", id: "text" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: {
                  total: 100,
                  noCache: 100,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 100, text: 100, reasoning: 0 },
              },
            },
          ],
        }),
      }),
    });
    const handler = createChatHandler({ model, hasApiKey: () => true });
    try {
      await page.route("**/api/generate", async (route) => {
        const body = route.request().postDataJSON();
        requests.push(body);
        if (fail) {
          fail = false;
          await route.fulfill({
            status: 503,
            body: "Temporarily unavailable. Please retry.",
          });
          return;
        }
        if (hold)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        const response = await handler(
          new Request("http://test.local/api/generate", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        );
        await route
          .fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: await response.text(),
          })
          .catch(() => {});
      });
      await page.goto(url);
      await page.getByRole("button", { name: /Ask AI Arthur/ }).click();
      const input = page.getByRole("textbox", {
        name: "Ask a question about Arthur",
      });
      await input.fill("What did Arthur do at Insight Rx?");
      await page.getByRole("button", { name: "Send message" }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Temporarily unavailable" })
        .waitFor();
      await page.getByRole("button", { name: "Retry response" }).click();
      await page
        .getByRole("button", { name: "Copy answer", exact: true })
        .waitFor();
      assert.equal(await page.locator(".bubble-user").count(), 1);
      assert.match(await page.locator(".bubble-assistant").innerText(), /55%/);
      await page
        .getByRole("button", {
          name: "What did he build at Procore?",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Copy answer", exact: true })
        .nth(1)
        .waitFor();
      assert.equal(requests.at(-1)!.messages.length, 3);
      assert.equal(
        requests
          .at(-1)!
          .messages[1].parts.some((part) => part.type === "data-answer"),
        true,
      );
      await page
        .getByRole("button", { name: "Start a new conversation", exact: true })
        .click();
      await page.getByRole("button", { name: /Current work/ }).waitFor();
      assert.equal(await page.locator(".bubble-user").count(), 0);
      hold = true;
      await input.fill("A question that can be stopped");
      await input.press("Enter");
      await page.getByRole("button", { name: "Stop response" }).waitFor();
      await page.getByRole("button", { name: "Stop response" }).click();
      await page.getByRole("button", { name: "Retry response" }).waitFor();
      release();
      hold = false;
      await page
        .getByRole("button", { name: "Start a new conversation", exact: true })
        .click();
      await page.getByRole("button", { name: /Current work/ }).waitFor();
      const before = requests.length;
      await input.fill("Line one");
      await input.press("Shift+Enter");
      await input.press("x");
      assert.equal(requests.length, before);
      assert.match(await input.inputValue(), /\n/);
      await page.setViewportSize({ width: 390, height: 844 });
      await input.fill("What did Arthur do at Insight Rx?");
      await input.press("Enter");
      await page
        .getByRole("button", { name: "Copy answer", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const sendBounds = await page
        .getByRole("button", { name: "Send message" })
        .boundingBox();
      assert.ok(
        sendBounds &&
          sendBounds.x >= 0 &&
          sendBounds.x + sendBounds.width <= 390,
      );
      if (process.env.CHAT_SCREENSHOT_PATH)
        await page.screenshot({ path: process.env.CHAT_SCREENSHOT_PATH });
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      assert.match(
        await page.evaluate(() => document.activeElement?.textContent ?? ""),
        /Ask AI Arthur/,
      );
      assert.deepEqual(pageErrors, []);
    } finally {
      release();
      await browser.close();
    }
  },
);
