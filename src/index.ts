import fs from "node:fs";
import { parseCommand } from "./commands.js";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: {
      id: number;
    };
  };
};

const botCommands = [
  { command: "start", description: "Show available commands" },
  { command: "today", description: "Get the last 24 hours of tech updates" },
  { command: "last", description: "Get updates for a custom window, like /last 6h" },
  { command: "x", description: "Show ranked X/Twitter tech signals" },
  { command: "ai", description: "Show live AI news from curated sources" },
  { command: "hn", description: "Show live Hacker News stories" },
  { command: "sources", description: "Show tracked topics, accounts, and feeds" },
  { command: "jobs", description: "Show job openings" },
  { command: "hackathons", description: "Show hackathon opportunities" },
] as const;

loadEnvFile();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Create a .env file from .env.example.");
  process.exit(1);
}

let offset = 0;

const apiUrl = (method: string) => `https://api.telegram.org/bot${token}/${method}`;

function loadEnvFile(): void {
  if (!fs.existsSync(".env")) return;

  const content = fs.readFileSync(".env", "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function telegram<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TelegramResponse<T>;

  if (!data.ok || data.result === undefined) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const replyText = await parseCommand(update.message.text);

  await telegram("sendMessage", {
    chat_id: chatId,
    text: replyText,
    disable_web_page_preview: true,
  });
}

async function configureBotCommands(): Promise<void> {
  await telegram("setMyCommands", {
    commands: botCommands,
  });
}

async function poll(): Promise<void> {
  try {
    const updates = await telegram<TelegramUpdate[]>("getUpdates", {
      offset,
      timeout: 30,
      allowed_updates: ["message"],
    });

    for (const update of updates) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  } finally {
    setTimeout(poll, 1000);
  }
}

console.log("Tech signal Telegram bot is running...");
await configureBotCommands();
poll();
