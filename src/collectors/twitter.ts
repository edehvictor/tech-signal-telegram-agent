export type TwitterPost = {
  id: string;
  authorName: string;
  authorHandle: string;
  text: string;
  url: string;
  createdAt: Date;
  likeCount: number;
  repostCount: number;
  replyCount: number;
};

const mockTwitterPosts: TwitterPost[] = [
  {
    id: "mock-1",
    authorName: "AI Builder",
    authorHandle: "aibuilder",
    text: "New open source AI agent SDK release: tool calling, memory, and workflow examples included.",
    url: "https://x.com/aibuilder/status/mock-1",
    createdAt: new Date("2026-05-09T09:00:00Z"),
    likeCount: 840,
    repostCount: 210,
    replyCount: 44,
  },
  {
    id: "mock-2",
    authorName: "Startup Jobs",
    authorHandle: "startupjobs",
    text: "Hiring: remote junior AI engineer to build LLM product features. TypeScript experience is a plus.",
    url: "https://x.com/startupjobs/status/mock-2",
    createdAt: new Date("2026-05-09T08:00:00Z"),
    likeCount: 130,
    repostCount: 35,
    replyCount: 10,
  },
  {
    id: "mock-3",
    authorName: "Tech Marketing",
    authorHandle: "techmarketing",
    text: "A celebrity-backed AI ad campaign just launched for small businesses.",
    url: "https://x.com/techmarketing/status/mock-3",
    createdAt: new Date("2026-05-09T07:00:00Z"),
    likeCount: 500,
    repostCount: 100,
    replyCount: 60,
  },
];

export async function fetchTwitterPosts(limit = 10): Promise<TwitterPost[]> {
  return mockTwitterPosts.slice(0, limit);
}
