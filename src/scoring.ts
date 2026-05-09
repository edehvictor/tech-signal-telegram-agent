export type SignalInput = {
  title: string;
  text?: string;
  source?: string;
  url?: string;
  publishedAt?: Date;
  engagementScore?: number;
};

export type SignalScore = {
  score: number;
  reasons: string[];
};

type KeywordRule = {
  keyword: string;
  weight: number;
  reason: string;
};

const positiveRules: KeywordRule[] = [
  { keyword: "agent", weight: 5, reason: "AI agent signal" },
  { keyword: "model", weight: 5, reason: "AI model update" },
  { keyword: "llm", weight: 5, reason: "LLM update" },
  { keyword: "open source", weight: 5, reason: "open-source signal" },
  { keyword: "benchmark", weight: 4, reason: "benchmark signal" },
  { keyword: "research", weight: 4, reason: "research signal" },
  { keyword: "paper", weight: 4, reason: "research paper" },
  { keyword: "api", weight: 4, reason: "developer API signal" },
  { keyword: "sdk", weight: 4, reason: "developer SDK signal" },
  { keyword: "developer", weight: 3, reason: "developer-focused update" },
  { keyword: "coding", weight: 3, reason: "coding signal" },
  { keyword: "inference", weight: 3, reason: "AI infrastructure signal" },
  { keyword: "multimodal", weight: 3, reason: "model capability signal" },
  { keyword: "startup", weight: 3, reason: "startup signal" },
  { keyword: "hiring", weight: 4, reason: "job opportunity signal" },
  { keyword: "job", weight: 4, reason: "job opportunity signal" },
  { keyword: "hackathon", weight: 4, reason: "hackathon opportunity signal" },
  { keyword: "release", weight: 2, reason: "new release signal" },
  { keyword: "launch", weight: 2, reason: "new launch signal" },
];

const negativeRules: KeywordRule[] = [
  { keyword: "ad", weight: -3, reason: "marketing-heavy signal" },
  { keyword: "ads", weight: -3, reason: "marketing-heavy signal" },
  { keyword: "campaign", weight: -3, reason: "campaign signal" },
  { keyword: "celebrity", weight: -3, reason: "low technical signal" },
  { keyword: "opinion", weight: -2, reason: "opinion signal" },
  { keyword: "podcast", weight: -2, reason: "media signal" },
];

function includesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
  return pattern.test(text);
}

function recencyBoost(publishedAt?: Date): number {
  if (!publishedAt) return 0;

  const ageMs = Date.now() - publishedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours <= 24) return 3;
  if (ageHours <= 72) return 2;
  if (ageHours <= 168) return 1;
  return 0;
}

function engagementBoost(engagementScore?: number): number {
  if (!engagementScore) return 0;

  if (engagementScore >= 500) return 3;
  if (engagementScore >= 100) return 2;
  if (engagementScore >= 25) return 1;
  return 0;
}

export function scoreSignal(signal: SignalInput): SignalScore {
  const text = [signal.title, signal.text, signal.source, signal.url].filter(Boolean).join(" ").toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  for (const rule of positiveRules) {
    if (includesKeyword(text, rule.keyword)) {
      score += rule.weight;
      reasons.push(rule.reason);
    }
  }

  for (const rule of negativeRules) {
    if (includesKeyword(text, rule.keyword)) {
      score += rule.weight;
      reasons.push(rule.reason);
    }
  }

  const recency = recencyBoost(signal.publishedAt);
  if (recency > 0) {
    score += recency;
    reasons.push("recent update");
  }

  const engagement = engagementBoost(signal.engagementScore);
  if (engagement > 0) {
    score += engagement;
    reasons.push("strong engagement");
  }

  return {
    score,
    reasons: [...new Set(reasons)],
  };
}
