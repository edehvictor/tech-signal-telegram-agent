import { chromium } from "playwright";

const profileDir = process.env.X_BROWSER_PROFILE_DIR ?? ".browser/x-profile";
const feedUrl = process.env.X_FEED_URL ?? "https://x.com/home";
const headless = process.env.X_BROWSER_HEADLESS === "true";
const browserChannel = process.env.X_BROWSER_CHANNEL;

const context = await chromium.launchPersistentContext(profileDir, {
  headless,
  ...(browserChannel ? { channel: browserChannel } : {}),
  viewport: { width: 1280, height: 900 },
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(feedUrl, { waitUntil: "commit", timeout: 30_000 }).catch(() => undefined);

console.log("X browser profile is open.");
console.log("Log into X in the browser window if needed.");
console.log("Close the browser window when you are done.");

await page.waitForEvent("close", { timeout: 0 }).catch(() => undefined);
await context.close().catch(() => undefined);
