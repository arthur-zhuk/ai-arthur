import { chromium } from "playwright";

const url = process.env.DEBUG_URL || "http://localhost:3002";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const logs = [];

  context.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ type, text });
    const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "📋";
    console.log(`${prefix} [${type}] ${text}`);
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.click('button:has-text("What are your most recent roles?")');
  await page.waitForTimeout(5000);

  await browser.close();

  const errors = logs.filter((l) => l.type === "error" || l.type === "warn");
  if (errors.length > 0) {
    console.log("\n--- Summary: Errors/Warnings captured ---");
    errors.forEach((e) => console.log(`[${e.type}]`, e.text));
    process.exit(1);
  }
  console.log("\nNo errors captured. (Note: API may return 500 if OPENAI_API_KEY is missing)");
}

main().catch((e) => {
  console.error("Debug script failed:", e);
  process.exit(1);
});
