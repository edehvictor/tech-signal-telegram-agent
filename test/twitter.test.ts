import assert from "node:assert/strict";
import test from "node:test";
import { fetchTwitterHandlePosts, fetchTwitterPosts } from "../src/collectors/twitter.js";
import {
  BrowserTwitterClient,
  MockTwitterClient,
  OfficialXApiClient,
  createTwitterClient,
} from "../src/collectors/twitterClient.js";

test("fetchTwitterPosts can use MockTwitterClient for development injection", async () => {
  const posts = await fetchTwitterPosts(3, new MockTwitterClient());

  assert.equal(posts.length, 3);
  assert.equal(posts[0]?.authorHandle, "OpenAI");
  assert.match(posts[0]?.text ?? "", /AI agent/);
  assert.match(posts[0]?.url ?? "", /https:\/\/x.com\/OpenAI\/status\//);
  assert.ok((posts[0]?.likeCount ?? 0) > 0);
});

test("fetchTwitterPosts can use an injected Twitter client", async () => {
  const posts = await fetchTwitterPosts(1, {
    getAccountPosts: async (account) => [
      {
        id: "custom-1",
        authorName: account.name,
        authorHandle: account.handle,
        text: "Injected client post about AI agents",
        url: `https://x.com/${account.handle}/status/custom-1`,
        createdAt: new Date("2026-05-11T10:00:00Z"),
        likeCount: 1,
        repostCount: 2,
        replyCount: 3,
      },
    ],
  });

  assert.equal(posts[0]?.id, "custom-1");
  assert.equal(posts[0]?.authorHandle, "OpenAI");
});

test("fetchTwitterPosts filters home feed posts using configured tech interests", async () => {
  const posts = await fetchTwitterPosts(5, {
    getFeedPosts: async () => [
      {
        id: "weak-1",
        authorName: "Food Account",
        authorHandle: "food",
        text: "Best breakfast photos today",
        url: "https://x.com/food/status/weak-1",
        createdAt: new Date("2026-05-11T10:00:00Z"),
        likeCount: 100,
        repostCount: 10,
        replyCount: 5,
      },
      {
        id: "strong-1",
        authorName: "Engineer",
        authorHandle: "engineer",
        text: "Open source AI agent SDK release for TypeScript developers",
        url: "https://x.com/engineer/status/strong-1",
        createdAt: new Date("2026-05-11T10:00:00Z"),
        likeCount: 10,
        repostCount: 2,
        replyCount: 1,
      },
      {
        id: "openai-1",
        authorName: "OpenAI",
        authorHandle: "OpenAI",
        text: "Company update",
        url: "https://x.com/OpenAI/status/openai-1",
        createdAt: new Date("2026-05-11T10:00:00Z"),
        likeCount: 10,
        repostCount: 2,
        replyCount: 1,
      },
    ],
    getAccountPosts: async () => [],
  });

  assert.deepEqual(
    posts.map((post) => post.id),
    ["strong-1", "openai-1"],
  );
});

test("fetchTwitterHandlePosts requests a specific X handle", async () => {
  const posts = await fetchTwitterHandlePosts("@openai", 1, {
    getAccountPosts: async (account) => [
      {
        id: "handle-1",
        authorName: account.name,
        authorHandle: account.handle,
        text: "Requested account post",
        url: `https://x.com/${account.handle}/status/handle-1`,
        createdAt: new Date("2026-05-11T10:00:00Z"),
        likeCount: 1,
        repostCount: 2,
        replyCount: 3,
      },
    ],
  });

  assert.equal(posts[0]?.authorHandle, "openai");
});

test("MockTwitterClient creates posts for configured account and keywords", async () => {
  const client = new MockTwitterClient();
  const posts = await client.getAccountPosts(
    {
      handle: "example",
      name: "Example Account",
      category: "ai",
      priority: 4,
      whyTrack: "Testing account",
    },
    [
      {
        term: "AI agent",
        category: "ai",
        priority: 5,
      },
    ],
    1,
  );

  assert.equal(posts[0]?.authorHandle, "example");
  assert.match(posts[0]?.text ?? "", /AI agent/);
  assert.match(posts[0]?.url ?? "", /https:\/\/x.com\/example\/status\//);
});

test("createTwitterClient returns browser client by default", () => {
  const client = createTwitterClient();

  assert.ok(client instanceof BrowserTwitterClient);
});

test("createTwitterClient can return mock client for explicit development mode", () => {
  const client = createTwitterClient("mock");

  assert.ok(client instanceof MockTwitterClient);
});

test("createTwitterClient can return official client for API mode", () => {
  const client = createTwitterClient("official");

  assert.ok(client instanceof OfficialXApiClient);
});

test("OfficialXApiClient explains missing token", async () => {
  const client = new OfficialXApiClient("");

  await assert.rejects(
    () =>
      client.getAccountPosts(
        {
          handle: "example",
          name: "Example Account",
          category: "ai",
          priority: 4,
          whyTrack: "Testing account",
        },
        [],
        1,
      ),
    /Missing X_BEARER_TOKEN/,
  );
});

test("OfficialXApiClient maps X API responses into TwitterPost objects", async () => {
  const requestedUrls: string[] = [];
  const fetcher = async (url: string | URL | Request) => {
    requestedUrls.push(String(url));

    if (String(url).includes("/users/by/username/example")) {
      return jsonResponse({
        data: {
          id: "user-1",
          name: "Example Account",
          username: "example",
        },
      });
    }

    return jsonResponse({
      data: [
        {
          id: "post-1",
          text: "New AI agent SDK release for developers",
          created_at: "2026-05-11T10:00:00Z",
          public_metrics: {
            like_count: 10,
            retweet_count: 3,
            quote_count: 2,
            reply_count: 4,
          },
        },
      ],
    });
  };

  const client = new OfficialXApiClient("test-token", fetcher as typeof fetch);
  const posts = await client.getAccountPosts(
    {
      handle: "example",
      name: "Example Account",
      category: "ai",
      priority: 4,
      whyTrack: "Testing account",
    },
    [
      {
        term: "AI agent",
        category: "ai",
        priority: 5,
      },
    ],
    1,
  );

  assert.equal(posts[0]?.id, "post-1");
  assert.equal(posts[0]?.authorHandle, "example");
  assert.equal(posts[0]?.likeCount, 10);
  assert.equal(posts[0]?.repostCount, 5);
  assert.equal(posts[0]?.replyCount, 4);
  assert.match(posts[0]?.url ?? "", /https:\/\/x.com\/example\/status\/post-1/);
  assert.ok(requestedUrls.some((url) => url.includes("/users/by/username/example")));
  assert.ok(requestedUrls.some((url) => url.includes("/users/user-1/tweets")));
});

test("OfficialXApiClient reports X API failures", async () => {
  const fetcher = async () =>
    ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
    }) as Response;

  const client = new OfficialXApiClient("bad-token", fetcher as typeof fetch);

  await assert.rejects(
    () =>
      client.getAccountPosts(
        {
          handle: "example",
          name: "Example Account",
          category: "ai",
          priority: 4,
          whyTrack: "Testing account",
        },
        [],
        1,
      ),
    /X API request failed: 401 Unauthorized/,
  );
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}
