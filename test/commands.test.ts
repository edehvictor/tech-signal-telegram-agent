import assert from "node:assert/strict";
import test from "node:test";
import { XBrowserProfileLockedError, XLoginRequiredError } from "../src/collectors/twitterClient.js";
import { buildBriefing, parseCommand } from "../src/commands.js";

test("/start explains the available commands", async () => {
  const reply = await parseCommand("/start");

  assert.match(reply, /tech signal bot/i);
  assert.match(reply, /\/today/);
  assert.match(reply, /\/x/);
  assert.match(reply, /\/x_login/);
  assert.match(reply, /\/x_status/);
  assert.match(reply, /\/x_close/);
  assert.match(reply, /\/ai/);
  assert.match(reply, /\/hn/);
  assert.match(reply, /\/sources/);
  assert.match(reply, /\/jobs/);
  assert.match(reply, /\/hackathons/);
  assert.doesNotMatch(reply, /\/news/);
  assert.doesNotMatch(reply, /\/trending/);
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

test("/sources shows tracked interests", async () => {
  const reply = await parseCommand("/sources");

  assert.match(reply, /Tracked sources and interests/);
  assert.match(reply, /Topics/);
  assert.match(reply, /X\/Twitter accounts/);
  assert.match(reply, /RSS sources/);
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

test("/hn returns live Hacker News format using injected data", async () => {
  const reply = await parseCommand("/hn", {
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

test("/x returns ranked X/Twitter signals using injected data", async () => {
  const reply = await parseCommand("/x", {
    fetchTwitterPosts: async () => [
      {
        id: "1",
        authorName: "Marketing Person",
        authorHandle: "marketing",
        text: "Celebrity AI ad campaign launches today",
        url: "https://x.com/marketing/status/1",
        createdAt: new Date("2026-05-09T08:00:00Z"),
        likeCount: 900,
        repostCount: 200,
        replyCount: 50,
      },
      {
        id: "2",
        authorName: "Engineer",
        authorHandle: "engineer",
        text: "Open source AI agent SDK release with TypeScript examples",
        url: "https://x.com/engineer/status/2",
        createdAt: new Date("2026-05-09T09:00:00Z"),
        likeCount: 120,
        repostCount: 40,
        replyCount: 20,
      },
    ],
  });

  assert.match(reply, /Latest X\/Twitter tech signals/);
  assert.match(reply, /X\/Twitter by @engineer/);
  assert.match(reply, /Relevance:/);
  assert.match(reply, /Likes: 120/);
  assert.match(reply, /Link: https:\/\/x.com\/engineer\/status\/2/);
  assert.ok(reply.indexOf("Open source AI agent SDK") < reply.indexOf("Celebrity AI ad campaign"));
});

test("/handle returns posts from a requested X account", async () => {
  const reply = await parseCommand("/handle openai", {
    fetchTwitterHandlePosts: async (handle) => [
      {
        id: "1",
        authorName: handle,
        authorHandle: handle,
        text: "New AI agent API release for developers",
        url: `https://x.com/${handle}/status/1`,
        createdAt: new Date("2026-05-09T08:00:00Z"),
        likeCount: 10,
        repostCount: 4,
        replyCount: 2,
      },
    ],
  });

  assert.match(reply, /Latest X\/Twitter tech signals/);
  assert.match(reply, /X\/Twitter by @openai/);
  assert.match(reply, /New AI agent API release/);
  assert.match(reply, /Link: https:\/\/x.com\/openai\/status\/1/);
});

test("/x handles collector failures gracefully", async () => {
  const reply = await parseCommand("/x", {
    fetchTwitterPosts: async () => {
      throw new Error("Missing X_BEARER_TOKEN. Add it to .env before using OfficialXApiClient.");
    },
  });

  assert.match(reply, /could not fetch X\/Twitter posts/i);
  assert.match(reply, /Missing X_BEARER_TOKEN/);
});

test("/x explains first-time browser login requirement", async () => {
  const reply = await parseCommand("/x", {
    fetchTwitterPosts: async () => {
      throw new XLoginRequiredError();
    },
  });

  assert.match(reply, /X login required/);
  assert.match(reply, /\/x_login/);
  assert.match(reply, /send \/x/i);
});

test("/x explains locked browser profile", async () => {
  const reply = await parseCommand("/x", {
    fetchTwitterPosts: async () => {
      throw new XBrowserProfileLockedError();
    },
  });

  assert.match(reply, /X browser profile is locked/);
  assert.match(reply, /Get-Process msedge/);
  assert.match(reply, /\/x_login/);
});

test("/x-status explains whether the reusable X browser session is open", async () => {
  const reply = await parseCommand("/x_status");

  assert.match(reply, /X browser session is not open|X browser session is open/);
});

test("/x-close closes the reusable X browser session", async () => {
  const reply = await parseCommand("/x_close");

  assert.match(reply, /X browser session closed/);
});

test("old hyphenated X browser commands still work as aliases", async () => {
  const statusReply = await parseCommand("/x-status");
  const closeReply = await parseCommand("/x-close");

  assert.match(statusReply, /X browser session is not open|X browser session is open/);
  assert.match(closeReply, /X browser session closed/);
});

test("/ai handles collector failures gracefully", async () => {
  const reply = await parseCommand("/ai", {
    fetchAiNews: async () => {
      throw new Error("network failed");
    },
  });

  assert.match(reply, /could not fetch live AI news/i);
});

test("/hn handles collector failures gracefully", async () => {
  const reply = await parseCommand("/hn", {
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
