import assert from "node:assert/strict";
import test from "node:test";
import { parseCommand } from "../src/commands.js";

test("/start explains the available commands", () => {
  const reply = parseCommand("/start");

  assert.match(reply, /tech signal bot/i);
  assert.match(reply, /\/today/);
});

test("/today returns a 24 hour briefing", () => {
  const reply = parseCommand("/today");

  assert.match(reply, /last 24 hours/i);
});

test("/last 6h returns a 6 hour briefing", () => {
  const reply = parseCommand("/last 6h");

  assert.match(reply, /last 6 hours/i);
});

test("unknown commands get a helpful fallback", () => {
  const reply = parseCommand("/unknown");

  assert.match(reply, /understand \/start/i);
});
