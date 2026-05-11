import assert from "node:assert/strict";
import test from "node:test";
import { buildSourcesSummary, loadSourcesConfig } from "../src/config.js";

test("loads configured sources from config/sources.json", () => {
  const config = loadSourcesConfig();

  assert.ok(config.trackedTopics.length >= 1);
  assert.ok(config.xAccounts.length >= 1);
  assert.ok(config.keywords.length >= 1);
  assert.ok(config.rssSources.length >= 1);
  assert.equal(config.trackedTopics[0]?.name, "AI agents");
});

test("buildSourcesSummary formats tracked interests", () => {
  const reply = buildSourcesSummary({
    trackedTopics: [
      {
        name: "AI agents",
        category: "ai",
        priority: 5,
        description: "Agent updates",
      },
    ],
    xAccounts: [
      {
        handle: "karpathy",
        name: "Andrej Karpathy",
        category: "top_signal",
        priority: 5,
        whyTrack: "Engineering posts",
      },
    ],
    keywords: [
      {
        term: "hackathon",
        category: "hackathon",
        priority: 5,
      },
    ],
    rssSources: [
      {
        name: "OpenAI News",
        url: "https://openai.com/news/rss.xml",
        category: "ai",
        enabled: true,
      },
    ],
  });

  assert.match(reply, /Tracked sources and interests/);
  assert.match(reply, /AI agents/);
  assert.match(reply, /@karpathy/);
  assert.match(reply, /hackathon/);
  assert.match(reply, /OpenAI News/);
});
