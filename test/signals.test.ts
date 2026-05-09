import assert from "node:assert/strict";
import test from "node:test";
import { formatSignals, rankSignals, twitterPostsToSignals } from "../src/signals.js";

test("rankSignals ranks high-signal items before weak items", () => {
  const ranked = rankSignals([
    {
      title: "AI ad campaign with celebrity interview",
      category: "ai",
      source: "Marketing feed",
    },
    {
      title: "Open source AI agent SDK release",
      category: "ai",
      source: "Developer feed",
    },
  ]);

  assert.equal(ranked[0]?.title, "Open source AI agent SDK release");
  assert.ok(ranked[0]?.relevance.score > ranked[1]?.relevance.score);
});

test("formatSignals formats ranked signals with links and relevance", () => {
  const reply = formatSignals(
    "Test signals",
    [
      {
        title: "New developer API for AI agents",
        category: "ai",
        source: "Example source",
        url: "https://example.com/api",
        publishedAt: new Date("2026-05-09T12:00:00Z"),
      },
    ],
    5,
  );

  assert.match(reply, /Test signals/);
  assert.match(reply, /Relevance:/);
  assert.match(reply, /Why ranked:/);
  assert.match(reply, /Published: 2026-05-09/);
  assert.match(reply, /Link: https:\/\/example.com\/api/);
});

test("twitterPostsToSignals converts posts into shared Signal shape", () => {
  const signals = twitterPostsToSignals([
    {
      id: "1",
      authorName: "Engineer",
      authorHandle: "engineer",
      text: "Hiring AI engineer for agent infrastructure",
      url: "https://x.com/engineer/status/1",
      createdAt: new Date("2026-05-09T09:00:00Z"),
      likeCount: 10,
      repostCount: 4,
      replyCount: 2,
    },
  ]);

  assert.equal(signals[0]?.title, "Hiring AI engineer for agent infrastructure");
  assert.equal(signals[0]?.source, "X/Twitter by @engineer");
  assert.equal(signals[0]?.engagementScore, 20);
  assert.equal(signals[0]?.metadata?.Likes, 10);
});
