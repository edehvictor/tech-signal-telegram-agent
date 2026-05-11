# Tech Signal Telegram Agent

A small TypeScript + Node.js Telegram bot that will grow into a daily tech briefing agent.

## Step 1

This first version only responds to:

- `/start`
- `/today`
- `/last 6h`
- `/last 24h`
- `/x`
- `/ai`
- `/hn`
- `/sources`
- `/jobs`
- `/hackathons`

The briefing data comes from local sample items for now. Each item can include a source link, and the bot includes that link in the Telegram reply.

`/x` currently uses mock X/Twitter posts to prove the source shape, ranking, and Telegram output. Later we will replace the mock collector with real X/Twitter access.

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
