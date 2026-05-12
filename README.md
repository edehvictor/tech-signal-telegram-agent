# Tech Signal Telegram Agent

A small TypeScript + Node.js Telegram bot that will grow into a daily tech briefing agent.

## Step 1

This first version only responds to:

- `/start`
- `/today`
- `/last 6h`
- `/last 24h`
- `/x`
- `/x_login`
- `/x_status`
- `/x_close`
- `/handle openai`
- `/ai`
- `/hn`
- `/sources`
- `/jobs`
- `/hackathons`

The briefing data comes from local sample items for now. Each item can include a source link, and the bot includes that link in the Telegram reply.

`/x` uses the configured X/Twitter client. Runtime defaults to browser mode, which reads your logged-in X home feed from a local Playwright browser profile. Mock X data is only used in tests or explicit development injection.

`/ai` fetches live AI news from curated sources, including AI research, product, infrastructure, and industry feeds. The source list is intentionally editable so the bot is not tied to one company.

`/hn` fetches live top stories from Hacker News and includes a link for each story.

`/sources` shows the topics, X/Twitter accounts, keywords, and RSS feeds from `config/sources.json`.

Live items are ranked by a shared scoring system before they are shown. The same scoring layer is designed to work for RSS feeds, Hacker News, and future X/Twitter posts.

When the bot starts, it registers these commands with Telegram so they appear when you type `/` in the bot chat.

## Configuration

Edit tracked sources and interests in:

- `config/sources.json`
- `config/scoring.json`

`config/sources.json` contains arrays of objects for topics, X/Twitter accounts, keywords, and RSS sources.

`config/scoring.json` contains extra positive and negative scoring rules. These rules are added on top of the built-in defaults.

## X Feed Mode

For free local X/Twitter access, use browser mode:

```env
TWITTER_CLIENT_MODE=browser
X_BROWSER_PROFILE_DIR=.browser/x-profile
X_BROWSER_HEADLESS=false
X_BROWSER_CHANNEL=msedge
X_FEED_URL=https://x.com/home
```

The first time you run `/x`, a browser window may open. Log into X manually in that browser profile. The bot does not store your X password.

Use `/x_login` to open the reusable browser session, `/x_status` to check whether it is open, `/x` to read the feed, and `/x_close` to close the browser session.

To attach to your normal signed-in Edge profile instead, close Edge first, set `X_BROWSER_PROFILE_DIR` to your Edge user data folder, set `X_BROWSER_CDP_URL=http://127.0.0.1:9222`, then run:

```bash
npm run x:edge
```

Keep that Edge window open while the bot is running.

## Setup

1. Create a Telegram bot with BotFather.
2. Copy `.env.example` to `.env`.
3. Put your bot token in `.env`.
4. Run:

```bash
npm start
```

## Development

Run the tests:

```bash
npm test
```

Build the TypeScript project:

```bash
npm run build
```

## BotFather

In Telegram:

1. Search for `@BotFather`.
2. Send `/start`.
3. Send `/newbot`.
4. Choose a display name, for example `Tech Signal Agent`.
5. Choose a username that ends with `bot`, for example `your_tech_signal_bot`.
6. Copy the token BotFather gives you.
7. Paste it into `.env`:

```env
TELEGRAM_BOT_TOKEN=your_token_here
```

Do not commit or share your `.env` file.
