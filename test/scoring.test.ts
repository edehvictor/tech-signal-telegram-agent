import assert from "node:assert/strict";
import test from "node:test";
import { scoreSignal } from "../src/scoring.js";

test("scores engineering and opportunity signals higher than weak marketing signals", () => {
  const strongSignal = scoreSignal({
    title: "Open source AI agent model adds new developer API",
    text: "Includes benchmarks and coding examples.",
  });

  const weakSignal = scoreSignal({
    title: "AI ad campaign launches with celebrity interview",
  });

  assert.ok(strongSignal.score > weakSignal.score);
  assert.match(strongSignal.reasons.join(" "), /agent|model|open-source|API|benchmark|coding/i);
});

test("adds boosts for recent and high-engagement signals", () => {
  const score = scoreSignal({
    title: "New LLM inference release",
    publishedAt: new Date(),
    engagementScore: 200,
  });

  assert.ok(score.score >= 10);
  assert.match(score.reasons.join(" "), /recent update/);
  assert.match(score.reasons.join(" "), /strong engagement/);
});

test("uses configured scoring rules from config/scoring.json", () => {
  const score = scoreSignal({
    title: "Remote TypeScript internship with application deadline",
  });

  assert.ok(score.score >= 12);
  assert.match(score.reasons.join(" "), /remote opportunity signal/);
  assert.match(score.reasons.join(" "), /TypeScript relevance/);
  assert.match(score.reasons.join(" "), /early-career opportunity signal/);
  assert.match(score.reasons.join(" "), /time-sensitive opportunity/);
});

test("uses configured negative rules from config/scoring.json", () => {
  const score = scoreSignal({
    title: "Viral AI meme giveaway drama",
  });

  assert.ok(score.score < 0);
  assert.match(score.reasons.join(" "), /low-signal promotion/);
  assert.match(score.reasons.join(" "), /low-signal drama/);
});
