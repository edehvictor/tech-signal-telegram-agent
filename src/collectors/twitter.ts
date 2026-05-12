import { loadSourcesConfig, type Keyword, type TrackedTopic, type XAccount } from "../config.js";
import { createTwitterClient, type TwitterClient } from "./twitterClient.js";

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

export async function fetchTwitterPosts(limit = 10, client: TwitterClient = createTwitterClient()): Promise<TwitterPost[]> {
  const config = loadSourcesConfig();
  const accounts = config.xAccounts.slice(0, Math.max(limit, 1));
  const keywords = config.keywords.length > 0 ? config.keywords : [];

  if (accounts.length === 0) {
    return [];
  }

  if (client.getFeedPosts) {
    const posts = await client.getFeedPosts(keywords, Math.max(limit * 3, limit));
    return filterTwitterPostsByConfig(posts, config.xAccounts, config.keywords, config.trackedTopics).slice(0, limit);
  }

  const accountPostGroups = await Promise.all(
    accounts.map((account) => client.getAccountPosts(account, keywords, 1)),
  );

  return accountPostGroups.flat().slice(0, limit);
}

export async function fetchTwitterHandlePosts(
  handle: string,
  limit = 5,
  client: TwitterClient = createTwitterClient(),
): Promise<TwitterPost[]> {
  const normalizedHandle = normalizeHandle(handle);

  if (!normalizedHandle) {
    throw new Error("Use a valid X handle, for example /handle openai.");
  }

  return client.getAccountPosts(
    {
      handle: normalizedHandle,
      name: normalizedHandle,
      category: "top_signal",
      priority: 3,
      whyTrack: "Requested directly in Telegram.",
    },
    [],
    limit,
  );
}

function filterTwitterPostsByConfig(
  posts: ReadonlyArray<TwitterPost>,
  accounts: ReadonlyArray<XAccount>,
  keywords: ReadonlyArray<Keyword>,
  topics: ReadonlyArray<TrackedTopic>,
): TwitterPost[] {
  const accountHandles = new Set(accounts.map((account) => account.handle.toLowerCase()));
  const terms = [
    ...keywords.map((keyword) => keyword.term),
    ...topics.flatMap((topic) => [topic.name, ...topic.description.split(/[,\s]+/)]),
  ]
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 3);

  return posts.filter((post) => {
    if (accountHandles.has(post.authorHandle.toLowerCase())) return true;

    const text = post.text.toLowerCase();
    return terms.some((term) => includesTerm(text, term));
  });
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").replace(/^https:\/\/x\.com\//i, "").split(/[/?#]/)[0] ?? "";
}

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(text);
}
