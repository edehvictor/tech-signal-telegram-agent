import assert from "node:assert/strict";
import test from "node:test";
import { buildBriefing, parseCommand } from "../src/commands.js";

test("/start explains the available commands", async () => {
  const reply = await parseCommand("/start");

  assert.match(reply, /tech signal bot/i);
  assert.match(reply, /\/today/);
  assert.match(reply, /\/ai/);
  assert.match(reply, /\/news/);
  assert.match(reply, /\/jobs/);
});

test("/today returns a 24 hour briefing with links", async () => {
  const reply = await parseCommand("/today");

  assert.match(reply, /last 24 hours/i);
  assert.match(reply, /Link: https:\/\//);
});

test("/last 6h returns only recent briefing items", async () => {
  const reply = await parseCommand("/last 6h");

  assert.match(reply, /last 6 hours/i);
  assert.match(reply, /Remote junior AI engineer/);
  assert.doesNotMatch(reply, /AI hackathon applications/);
});

test("/last explains the expected time window format", async () => {
  const reply = await parseCommand("/last");

  assert.match(reply, /\/last 6h/);
  assert.match(reply, /\/last 24h/);
});

test("unknown commands get a helpful fallback", async () => {
  const reply = await parseCommand("/unknown");

  assert.match(reply, /understand \/start/i);
});

test("/jobs returns job items with links", async () => {
  const reply = await parseCommand("/jobs");

  assert.match(reply, /Jobs for the last 24 hours/i);
  assert.match(reply, /Remote junior AI engineer/);
  assert.match(reply, /Link: https:\/\//);
  assert.doesNotMatch(reply, /AI hackathon applications/);
});

test("/hackathons returns hackathon items", async () => {
  const reply = await parseCommand("/hackathons");

  assert.match(reply, /Hackathons for the last 24 hours/i);
  assert.match(reply, /AI hackathon applications/);
});

test("/trending returns trending tool items", async () => {
  const reply = await parseCommand("/trending");

  assert.match(reply, /Trending tools for the last 24 hours/i);
  assert.match(reply, /GitHub repo/);
});

test("/news returns live story format using injected data", async () => {
  const reply = await parseCommand("/news", {
    fetchHackerNewsTopStories: async () => [
      {
        id: 1,
        title: "Celebrity founder interview",
        url: "https://example.com/interview",
        score: 200,
        author: "media",
      },
      {
        id: 2,
        title: "Show HN: Useful developer tool",
        url: "https://example.com/dev-tool",
        score: 120,
        author: "builder",
      },
    ],
  });

  assert.match(reply, /Top Hacker News tech stories/);
  assert.match(reply, /Show HN: Useful developer tool/);
  assert.match(reply, /Relevance:/);
  assert.match(reply, /Link: https:\/\/example.com\/dev-tool/);
  assert.ok(reply.indexOf("Show HN: Useful developer tool") < reply.indexOf("Celebrity founder interview"));
});

test("/ai returns curated AI news using injected data", async () => {
  const reply = await parseCommand("/ai", {
    fetchAiNews: async () => [
      {
        title: "AI ad campaign launches for small businesses",
        source: "Example Marketing Source",
        url: "https://example.com/ai-ad",
      },
      {
        title: "New open model improves coding benchmarks",
        source: "Example AI Source",
        url: "https://example.com/ai-news",
        publishedAt: new Date("2026-05-09T10:00:00Z"),
      },
    ],
  });

  assert.match(reply, /Latest AI news/);
  assert.match(reply, /New open model improves coding benchmarks/);
  assert.match(reply, /Source: Example AI Source/);
  assert.match(reply, /Relevance:/);
  assert.match(reply, /Published: 2026-05-09/);
  assert.match(reply, /Link: https:\/\/example.com\/ai-news/);
  assert.ok(reply.indexOf("New open model improves coding benchmarks") < reply.indexOf("AI ad campaign"));
});

test("/ai handles collector failures gracefully", async () => {
  const reply = await parseCommand("/ai", {
    fetchAiNews: async () => {
      throw new Error("network failed");
    },
  });

  assert.match(reply, /could not fetch live AI news/i);
});

test("/news handles collector failures gracefully", async () => {
  const reply = await parseCommand("/news", {
    fetchHackerNewsTopStories: async () => {
      throw new Error("network failed");
    },
  });

  assert.match(reply, /could not fetch live Hacker News/i);
});

test("empty briefing windows explain that nothing matched", () => {
  const reply = buildBriefing(1);

  assert.match(reply, /No matching tech updates/i);
});
