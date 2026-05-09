type HackerNewsItemResponse = {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  score?: number;
};

export type HackerNewsStory = {
  id: number;
  title: string;
  url: string;
  score: number;
  author: string;
};

const baseUrl = "https://hacker-news.firebaseio.com/v0";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchHackerNewsTopStories(limit = 5): Promise<HackerNewsStory[]> {
  const storyIds = await fetchJson<number[]>(`${baseUrl}/topstories.json`);
  const selectedIds = storyIds.slice(0, limit);

  const items = await Promise.all(
    selectedIds.map((id) => fetchJson<HackerNewsItemResponse>(`${baseUrl}/item/${id}.json`)),
  );

  return items
    .filter((item) => item.type === "story" && item.title)
    .map((item) => ({
      id: item.id,
      title: item.title ?? "Untitled story",
      url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score ?? 0,
      author: item.by ?? "unknown",
    }));
}
