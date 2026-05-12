import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const defaultEdgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const edgePath = process.env.X_BROWSER_EXECUTABLE_PATH ?? defaultEdgePaths.find((path) => existsSync(path));
const profileDir =
  process.env.X_BROWSER_PROFILE_DIR ??
  `${process.env.LOCALAPPDATA ?? ""}\\Microsoft\\Edge\\User Data`;
const feedUrl = process.env.X_FEED_URL ?? "https://x.com/home";
const debuggingPort = process.env.X_BROWSER_DEBUG_PORT ?? "9222";

if (!edgePath) {
  throw new Error("Microsoft Edge executable was not found. Set X_BROWSER_EXECUTABLE_PATH in .env.");
}

const child = spawn(
  edgePath,
  [
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    "--profile-directory=Default",
    feedUrl,
  ],
  {
    detached: true,
    stdio: "ignore",
  },
);

child.unref();

console.log("Signed-in Edge started for the bot.");
console.log(`Debug URL: http://127.0.0.1:${debuggingPort}`);
console.log("Keep this Edge window open while using /x.");
