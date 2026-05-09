export function buildMockBriefing(hours) {
  return [
    `Tech briefing for the last ${hours} hours`,
    "",
    "Top signals",
    "1. AI tooling: A new developer tool is trending among engineers.",
    "Why it matters: this is the kind of source we will later rank and summarize.",
    "",
    "Jobs",
    "- Example: Remote AI engineer role at a startup.",
    "",
    "Hackathons",
    "- Example: Upcoming AI hackathon with applications open.",
  ].join("\n");
}

export function parseCommand(text) {
  const normalized = text.trim().toLowerCase();

  if (normalized === "/start") {
    return [
      "Hi. I am your tech signal bot.",
      "",
      "Try:",
      "/today",
      "/last 6h",
      "/last 24h",
    ].join("\n");
  }

  if (normalized === "/today") {
    return buildMockBriefing(24);
  }

  const lastMatch = normalized.match(/^\/last\s+(\d+)h$/);
  if (lastMatch) {
    return buildMockBriefing(Number(lastMatch[1]));
  }

  return "I understand /start, /today, and /last 6h for now.";
}
