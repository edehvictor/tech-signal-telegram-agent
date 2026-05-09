import assert from "node:assert/strict";
import test from "node:test";
import { buildBriefing, parseCommand } from "../src/commands.js";

test("/start explains the available commands", () => {
  const reply = parseCommand("/start");

  assert.match(reply, /tech signal bot/i);
  assert.match(reply, /\/today/);
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

test("empty briefing windows explain that nothing matched", () => {
  const reply = buildBriefing(1);

  assert.match(reply, /No matching tech updates/i);
});
