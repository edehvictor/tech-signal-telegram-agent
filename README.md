# Tech Signal Telegram Agent

A small TypeScript + Node.js Telegram bot that will grow into a daily tech briefing agent.

## Step 1

This first version only responds to:

- `/start`
- `/today`
- `/last 6h`
- `/last 24h`

The briefing data comes from local sample items for now. Each item can include a source link, and the bot includes that link in the Telegram reply.

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
