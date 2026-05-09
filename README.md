# Tech Signal Telegram Agent

A small TypeScript + Node.js Telegram bot that will grow into a daily tech briefing agent.

## Step 1

This first version only responds to:

- `/start`
- `/today`
- `/last 6h`
- `/last 24h`
- `/ai`
- `/news`
- `/jobs`
- `/hackathons`
- `/trending`

The briefing data comes from local sample items for now. Each item can include a source link, and the bot includes that link in the Telegram reply.

`/ai` fetches live AI news from curated sources, including AI research, product, infrastructure, and industry feeds. The source list is intentionally editable so the bot is not tied to one company.

`/news` fetches live top stories from Hacker News and includes a link for each story.

When the bot starts, it registers these commands with Telegram so they appear when you type `/` in the bot chat.

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
