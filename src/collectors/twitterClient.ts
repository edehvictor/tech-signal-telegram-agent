import { type Keyword, type XAccount } from "../config.js";
import { type TwitterPost } from "./twitter.js";
import type { Browser, BrowserContext, Page } from "playwright";

type Fetcher = typeof fetch;

type XUserLookupResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
  };
};

type XTimelineResponse = {
  data?: XPostResponse[];
};

type XPostResponse = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
};

export type TwitterClient = {
  getFeedPosts?(keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]>;
  getAccountPosts(account: XAccount, keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]>;
};

export class XLoginRequiredError extends Error {
  constructor() {
    super(
      "X login required. Send /x_login, sign into X in the browser window, keep it open after the feed loads, then send /x.",
    );
    this.name = "XLoginRequiredError";
  }
}

export class XBrowserProfileLockedError extends Error {
  constructor() {
    super(
      "Edge profile is locked by another Edge process. Close all Edge windows and stop hidden Edge background processes, then try /x again.",
    );
    this.name = "XBrowserProfileLockedError";
  }
}

export function createTwitterClient(mode = process.env.TWITTER_CLIENT_MODE ?? "browser"): TwitterClient {
  if (mode === "browser") {
    return new BrowserTwitterClient();
  }

  if (mode === "official") {
    return new OfficialXApiClient();
  }

  return new MockTwitterClient();
}

export class MockTwitterClient implements TwitterClient {
  async getAccountPosts(account: XAccount, keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]> {
    const selectedKeywords = keywords.length > 0 ? keywords.slice(0, limit) : [];

    if (selectedKeywords.length === 0) {
      return [buildFallbackPost(account)];
    }

    return selectedKeywords.map((keyword, index) => buildMockPost(account, keyword, index)).slice(0, limit);
  }
}

export class OfficialXApiClient implements TwitterClient {
  private readonly baseUrl = "https://api.x.com/2";

  constructor(
    private readonly bearerToken = process.env.X_BEARER_TOKEN,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async getAccountPosts(account: XAccount, keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]> {
    if (!this.bearerToken) {
      throw new Error("Missing X_BEARER_TOKEN. Add it to .env before using OfficialXApiClient.");
    }

    const user = await this.getUserByUsername(account.handle);
    const posts = await this.getUserPosts(user.id, limit);
    const matchingPosts = filterPostsByKeywords(posts, keywords);
    const selectedPosts = matchingPosts.length > 0 ? matchingPosts : posts;

    return selectedPosts.slice(0, limit).map((post) => toTwitterPost(post, account));
  }

  private async getUserByUsername(username: string): Promise<NonNullable<XUserLookupResponse["data"]>> {
    const response = await this.get<XUserLookupResponse>(
      `/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,
    );

    if (!response.data) {
      throw new Error(`X user not found: @${username}`);
    }

    return response.data;
  }

  private async getUserPosts(userId: string, limit: number): Promise<XPostResponse[]> {
    const maxResults = Math.max(5, Math.min(100, limit));
    const query = new URLSearchParams({
      "tweet.fields": "created_at,public_metrics",
      exclude: "retweets,replies",
      max_results: String(maxResults),
    });
    const response = await this.get<XTimelineResponse>(`/users/${userId}/tweets?${query.toString()}`);

    return response.data ?? [];
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`X API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }
}

export class BrowserTwitterClient implements TwitterClient {
  private static browser: Browser | undefined;
  private static context: BrowserContext | undefined;
  private static page: Page | undefined;
  private static sessionMode: "cdp" | "persistent" | undefined;

  constructor(
    private readonly profileDir = process.env.X_BROWSER_PROFILE_DIR ?? ".browser/x-profile",
    private readonly feedUrl = process.env.X_FEED_URL ?? "https://x.com/home",
    private readonly headless = process.env.X_BROWSER_HEADLESS === "true",
    private readonly browserChannel = process.env.X_BROWSER_CHANNEL,
    private readonly cdpUrl = process.env.X_BROWSER_CDP_URL,
  ) {}

  static async closeSession(): Promise<void> {
    if (BrowserTwitterClient.sessionMode !== "cdp") {
      await BrowserTwitterClient.context?.close().catch(() => undefined);
    }

    BrowserTwitterClient.browser = undefined;
    BrowserTwitterClient.context = undefined;
    BrowserTwitterClient.page = undefined;
    BrowserTwitterClient.sessionMode = undefined;
  }

  static isSessionOpen(): boolean {
    return Boolean(BrowserTwitterClient.context && BrowserTwitterClient.page && !BrowserTwitterClient.page.isClosed());
  }

  async openLoginPage(): Promise<void> {
    const page = await this.getPage();
    await page.goto(this.feedUrl, { waitUntil: "commit", timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
  }

  async getFeedPosts(keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]> {
    const page = await this.getPage();

    await page.goto(this.feedUrl, { waitUntil: "commit", timeout: 30_000 }).catch(() => undefined);
    return this.collectPostsFromCurrentPage(page, keywords, limit, this.feedUrl);
  }

  async getAccountPosts(account: XAccount, keywords: ReadonlyArray<Keyword>, limit: number): Promise<TwitterPost[]> {
    const page = await this.getPage();
    const profileUrl = `https://x.com/${account.handle}`;

    await page.goto(profileUrl, { waitUntil: "commit", timeout: 30_000 }).catch(() => undefined);
    return this.collectPostsFromCurrentPage(page, keywords, limit, profileUrl);
  }

  private async collectPostsFromCurrentPage(
    page: Page,
    keywords: ReadonlyArray<Keyword>,
    limit: number,
    sourceUrl: string,
  ): Promise<TwitterPost[]> {
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
    const feedLoaded = await page.waitForSelector("article", { timeout: 60_000 }).then(
      () => true,
      () => false,
    );

    if (!feedLoaded || (await isLoginScreen(page))) {
      throw new XLoginRequiredError();
    }

    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1500);

    const rawPosts = await page.locator("article").evaluateAll((articles) =>
      articles.map((article, index) => {
        const text = article.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const statusLink = Array.from(article.querySelectorAll("a"))
          .map((link) => link.href)
          .find((href) => /\/status\/\d+/.test(href));
        const urlHandleMatch = statusLink?.match(/x\.com\/([^/]+)\/status\/\d+/i);
        const textHandleMatch = text.match(/@([A-Za-z0-9_]+)/);

        return {
          index,
          text,
          url: statusLink,
          authorHandle: urlHandleMatch?.[1] ?? textHandleMatch?.[1] ?? "unknown",
        };
      }),
    );

    const posts = rawPosts
      .filter((post) => post.text.length > 0 && post.url)
      .map((post): TwitterPost => {
        const id = post.url?.match(/\/status\/(\d+)/)?.[1] ?? `browser-${post.index}`;

        return {
          id,
          authorName: post.authorHandle,
          authorHandle: post.authorHandle,
          text: post.text,
          url: post.url ?? sourceUrl,
          createdAt: new Date(),
          likeCount: 0,
          repostCount: 0,
          replyCount: 0,
        };
      })
      .slice(0, limit);

    if (posts.length === 0) {
      throw new Error("No matching X feed posts found in your home feed.");
    }

    return posts;
  }

  private async getPage(): Promise<Page> {
    if (BrowserTwitterClient.context && BrowserTwitterClient.page && !BrowserTwitterClient.page.isClosed()) {
      return BrowserTwitterClient.page;
    }

    if (BrowserTwitterClient.context) {
      BrowserTwitterClient.page =
        BrowserTwitterClient.context.pages().find((page) => !page.isClosed()) ?? (await BrowserTwitterClient.context.newPage());
      BrowserTwitterClient.page.on("close", () => {
        BrowserTwitterClient.page = undefined;
      });

      return BrowserTwitterClient.page;
    }

    const { chromium } = await import("playwright");

    if (this.cdpUrl) {
      BrowserTwitterClient.browser = await chromium.connectOverCDP(this.cdpUrl).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not connect to signed-in Edge. Start Edge with npm run x:edge first. ${message}`);
      });
      BrowserTwitterClient.sessionMode = "cdp";
      BrowserTwitterClient.context = BrowserTwitterClient.browser.contexts()[0] ?? (await BrowserTwitterClient.browser.newContext());
      BrowserTwitterClient.browser.on("disconnected", () => {
        BrowserTwitterClient.browser = undefined;
        BrowserTwitterClient.context = undefined;
        BrowserTwitterClient.page = undefined;
        BrowserTwitterClient.sessionMode = undefined;
      });
      BrowserTwitterClient.page =
        BrowserTwitterClient.context.pages().find((page) => !page.isClosed() && page.url().includes("x.com")) ??
        BrowserTwitterClient.context.pages().find((page) => !page.isClosed()) ??
        (await BrowserTwitterClient.context.newPage());
      BrowserTwitterClient.page.on("close", () => {
        BrowserTwitterClient.page = undefined;
      });

      return BrowserTwitterClient.page;
    }

    BrowserTwitterClient.context = await chromium
      .launchPersistentContext(this.profileDir, {
        headless: this.headless,
        ...(this.browserChannel ? { channel: this.browserChannel } : {}),
        viewport: { width: 1280, height: 900 },
      })
      .catch((error: unknown) => {
        if (isBrowserProfileLockError(error)) {
          throw new XBrowserProfileLockedError();
        }

        throw error;
      });
    BrowserTwitterClient.sessionMode = "persistent";

    BrowserTwitterClient.page = BrowserTwitterClient.context.pages()[0] ?? (await BrowserTwitterClient.context.newPage());
    BrowserTwitterClient.page.on("close", () => {
      BrowserTwitterClient.page = undefined;
    });

    return BrowserTwitterClient.page;
  }
}

function isBrowserProfileLockError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("Target page, context or browser has been closed") ||
    error.message.includes("process did exit: exitCode=21")
  );
}

async function isLoginScreen(page: { url(): string; locator(selector: string): { count(): Promise<number> } }): Promise<boolean> {
  const url = page.url();

  if (url.includes("/i/flow/login") || url.includes("/login")) {
    return true;
  }

  const loginInputs = await page.locator('input[name="text"], input[name="password"]').count();
  const loginLinks = await page.locator('a[href="/login"], a[href="https://x.com/login"]').count();

  return loginInputs > 0 || loginLinks > 0;
}

function filterPostsByKeywords(posts: ReadonlyArray<XPostResponse>, keywords: ReadonlyArray<Keyword>): XPostResponse[] {
  if (keywords.length === 0) return [...posts];

  const terms = keywords.map((keyword) => keyword.term.toLowerCase());

  return posts.filter((post) => {
    const text = post.text.toLowerCase();
    return terms.some((term) => text.includes(term));
  });
}

function toTwitterPost(post: XPostResponse, account: XAccount): TwitterPost {
  const metrics = post.public_metrics ?? {};

  return {
    id: post.id,
    authorName: account.name,
    authorHandle: account.handle,
    text: post.text,
    url: `https://x.com/${account.handle}/status/${post.id}`,
    createdAt: post.created_at ? new Date(post.created_at) : new Date(),
    likeCount: metrics.like_count ?? 0,
    repostCount: (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0),
    replyCount: metrics.reply_count ?? 0,
  };
}

function buildMockPost(account: XAccount, keyword: Keyword, index: number): TwitterPost {
  const createdAt = new Date(Date.now() - index * 60 * 60 * 1000);
  const id = `mock-${account.handle.toLowerCase()}-${index + 1}`;

  return {
    id,
    authorName: account.name,
    authorHandle: account.handle,
    text: `${account.name} update: ${keyword.term} signal for ${keyword.category}. ${account.whyTrack}`,
    url: `https://x.com/${account.handle}/status/${id}`,
    createdAt,
    likeCount: account.priority * 120 + keyword.priority * 30,
    repostCount: account.priority * 24 + keyword.priority * 8,
    replyCount: account.priority * 6 + keyword.priority,
  };
}

function buildFallbackPost(account: XAccount): TwitterPost {
  const id = `mock-${account.handle.toLowerCase()}-fallback`;

  return {
    id,
    authorName: account.name,
    authorHandle: account.handle,
    text: `${account.name} update. ${account.whyTrack}`,
    url: `https://x.com/${account.handle}/status/${id}`,
    createdAt: new Date(),
    likeCount: account.priority * 100,
    repostCount: account.priority * 20,
    replyCount: account.priority * 5,
  };
}
