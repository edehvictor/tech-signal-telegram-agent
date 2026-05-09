import assert from "node:assert/strict";
import test from "node:test";
import { buildBriefing, parseCommand } from "../src/commands.js";

test("/start explains the available commands", () => {
  const reply = parseCommand("/start");

  assert.match(reply, /tech signal bot/i);
  assert.match(reply, /\/today/);
  assert.match(reply, /\/jobs/);
});

test("/today returns a 24 hour briefing with links", () => {
  const reply = parseCommand("/today");

  assert.match(reply, /last 24 hours/i);
  assert.match(reply, /Link: https:\/\//);
});

test("/last 6h returns only recent briefing items", () => {
  const reply = parseCommand("/last 6h");

  assert.match(reply, /last 6 hours/i);
  assert.match(reply, /Remote junior AI engineer/);
  assert.doesNotMatch(reply, /AI hackathon applications/);
});

test("unknown commands get a helpful fallback", () => {
  const reply = parseCommand("/unknown");

  assert.match(reply, /understand \/start/i);
});

test("/jobs returns job items with links", () => {
  const reply = parseCommand("/jobs");

  assert.match(reply, /Jobs for the last 24 hours/i);
  assert.match(reply, /Remote junior AI engineer/);
  assert.match(reply, /Link: https:\/\//);
  assert.doesNotMatch(reply, /AI hackathon applications/);
});

test("/hackathons returns hackathon items", () => {
  const reply = parseCommand("/hackathons");

  assert.match(reply, /Hackathons for the last 24 hours/i);
  assert.match(reply, /AI hackathon applications/);
});

test("/trending returns trending tool items", () => {
  const reply = parseCommand("/trending");

  assert.match(reply, /Trending tools for the last 24 hours/i);
  assert.match(reply, /GitHub repo/);
});

test("empty briefing windows explain that nothing matched", () => {
  const reply = buildBriefing(1);

  assert.match(reply, /No matching tech updates/i);
});
