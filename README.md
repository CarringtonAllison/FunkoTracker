# Funko Tracker

A Funko-themed web application that monitors [funko.com](https://www.funko.com) for new product releases, back-in-stock items, and news updates. It uses a two-agent AI pipeline powered by Claude to scrape, deduplicate, and persist data — then displays everything in a live, responsive dashboard.

---

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running in Development](#running-in-development)
- [Using the App](#using-the-app)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## What It Does

The dashboard shows three live sections pulled from funko.com:

| Section | Description |
|---|---|
| **New Releases** | Newly listed products with prices, images, and release dates |
| **Back in Stock** | Products that have been restocked, with restock timestamps |
| **News & Updates** | Announcements, blog posts, and product news |

Each section shows the item count, product images, pricing, and links directly to the product or article on funko.com. A **Refresh Now** button triggers a fresh scrape on demand. The header always shows the last time data was successfully fetched.

---

## How It Works

When you click **Refresh Now**, a two-agent AI pipeline runs:

```
Browser opens (Playwright / headless Chromium)
        │
        ▼
┌─────────────────────────────────────┐
│  Agent 1 — Scraper Agent            │
│  • Navigates funko.com              │
│  • Calls 3 scraping tools:          │
│    - scrape_new_releases            │
│    - scrape_back_in_stock           │
│    - scrape_news_updates            │
│  • Returns structured JSON          │
└─────────────────────────────────────┘
        │
        │  ScraperOutput (JSON)
        ▼
┌─────────────────────────────────────┐
│  Agent 2 — Processor Agent          │
│  • Receives Agent 1's output        │
│  • For every item, calls:           │
│    - upsert_new_release             │
│    - upsert_back_in_stock           │
│    - upsert_news_item               │
│  • Deduplicates using SHA-256 URL   │
│    hash — only saves new/changed    │
│    records to keep the DB clean     │
│  • Logs the fetch run               │
└─────────────────────────────────────┘
        │
        ▼
  SQLite database updated
  Frontend re-fetches via React Query
```

Both agents use Claude's tool use (function calling) API in an agentic loop. The database is a local SQLite file — no external database needed.

---

## Tech Stack

**Backend**
- [Node.js](https://nodejs.org) (v20+)
- [TypeScript](https://www.typescriptlang.org/) via [tsx](https://github.com/privatenumber/tsx) (no build step needed in dev)
- [Express](https://expressjs.com/) — REST API server
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node) — Claude AI agents (`claude-opus-4-6`)
- [Playwright](https://playwright.dev/) — headless Chromium for web scraping
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local SQLite database
- [dotenv](https://github.com/motdotla/dotenv) — environment variable loading

**Frontend**
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — dev server and bundler
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- [TanStack Query (React Query)](https://tanstack.com/query) — data fetching and cache invalidation
- [axios](https://axios-http.com/) — HTTP client

---

## Prerequisites

Before installing, make sure you have all of the following:

### 1. Node.js (v20 or later — v24 recommended)

Check your version:
```bash
node --version
```

If you don't have Node.js, download it from [nodejs.org](https://nodejs.org). Choose the **LTS** version. npm is included with Node.js.

### 2. Git

Check if Git is installed:
```bash
git --version
```

If not, download it from [git-scm.com](https://git-scm.com).

### 3. An Anthropic API Key

The AI agents run on Claude via the Anthropic API. You need an API key to use it.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**, give it a name, and copy the key — it starts with `sk-ant-`

> **Note:** API usage is billed per token. A single refresh run scrapes funko.com and runs two Claude agentic loops. Keep this in mind if you run it frequently.

### 4. Windows: Visual Studio Build Tools (for better-sqlite3)

`better-sqlite3` is a native Node.js addon and requires C++ build tools on Windows.

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Run the installer and select **"Desktop development with C++"**
3. Click Install and wait for it to complete
4. Restart your terminal after installation

> If you already use Visual Studio or have run Node.js native addons before, this is likely already set up.

---

## Project Structure

```
funko-tracker/
├── .env                        # Your local environment variables (not committed)
├── .env.example                # Template showing required env vars
├── .gitignore
├── package.json                # Root workspace — coordinates backend + frontend
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Express server entry point
│       ├── types/
│       │   └── funko.ts        # Shared TypeScript interfaces
│       ├── db/
│       │   ├── client.ts       # SQLite connection singleton
│       │   ├── migrations.ts   # CREATE TABLE statements (run on startup)
│       │   └── queries.ts      # Typed read/write query functions
│       ├── agents/
│       │   ├── scraperAgent.ts     # Agent 1 — Claude scraping loop
│       │   ├── processorAgent.ts   # Agent 2 — Claude dedup/persist loop
│       │   ├── pipeline.ts         # Orchestrates Agent 1 → Agent 2
│       │   └── tools/
│       │       ├── scrapeTools.ts      # Playwright tool executors for Agent 1
│       │       └── processorTools.ts   # SQLite tool executors for Agent 2
│       └── routes/
│           ├── data.ts         # GET /api/data, GET /api/last-fetched
│           └── refresh.ts      # POST /api/refresh
│
└── frontend/
    ├── package.json
    ├── vite.config.ts          # Vite config + /api proxy to localhost:3001
    ├── tsconfig.json
    └── src/
        ├── main.tsx            # React entry point
        ├── App.tsx             # Dashboard layout
        ├── index.css           # Tailwind + Funko brand theme tokens
        ├── types/
        │   └── funko.ts        # Frontend TypeScript interfaces (mirrors backend)
        ├── api/
        │   └── funkoApi.ts     # React Query hooks: useFunkoData, useRefresh
        └── components/
            ├── Header.tsx          # Sticky header with refresh button + timestamp
            ├── FunkoCard.tsx       # Product card (image, price, badge)
            ├── NewsCard.tsx        # News article card
            ├── SectionHeader.tsx   # Section title with accent bar + count badge
            └── EmptyState.tsx      # Placeholder when a section has no data
```

The SQLite database file is created automatically at `backend/data/funko.db` on first run.

---

## Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/CarringtonAllison/FunkoTracker.git
cd FunkoTracker
```

### Step 2 — Install backend dependencies

```bash
cd backend
npm install
```

> If you get a `better-sqlite3` build error on Windows, make sure Visual Studio Build Tools are installed (see [Prerequisites](#prerequisites) above), then run `npm install` again.

### Step 3 — Install the Playwright browser

Playwright needs a local copy of Chromium to run headless scraping. Run this once from the backend directory:

```bash
npx playwright install chromium
```

This downloads ~300 MB of browser binaries to your local Playwright cache. You only need to do this once.

### Step 4 — Install frontend dependencies

Open a new terminal (or navigate back to the root):

```bash
cd ../frontend
npm install
```

---

## Configuration

### Create your `.env` file

The backend reads environment variables from a `.env` file in the **project root** (`funko-tracker/`). An example file is already included.

From the project root:

```bash
# Copy the example file
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
DB_PATH=./data/funko.db
```

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key (starts with `sk-ant-`) |
| `PORT` | No | Port for the backend server. Defaults to `3001` |
| `DB_PATH` | No | Path to the SQLite database file. Defaults to `./data/funko.db` |

> The `.env` file is listed in `.gitignore` and will never be committed to version control. Never share or commit your API key.

---

## Running in Development

You need **two terminals** running at the same time — one for the backend and one for the frontend.

### Terminal 1 — Start the backend

```bash
cd funko-tracker/backend
npx tsx src/index.ts
```

You should see:
```
[Server] Funko Tracker API running on http://localhost:3001
```

The backend uses `tsx` to run TypeScript directly — no compile step needed.

> For auto-reload on file changes during development, use:
> ```bash
> npx tsx watch src/index.ts
> ```

### Terminal 2 — Start the frontend

```bash
cd funko-tracker/frontend
npm run dev
```

You should see:
```
  VITE ready in Xms

  ➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Using the App

### First launch

When you first open the app, all three sections will be empty. The database starts with no data until you trigger a refresh.

### Triggering a refresh

Click **Refresh Now** in the top-right corner of the header. This:

1. Sends a `POST /api/refresh` request to the backend
2. Launches a headless Chromium browser
3. Runs Agent 1 (scraper) — this can take 30–90 seconds depending on funko.com's response time
4. Passes the scraped data to Agent 2 (processor) which deduplicates and saves to SQLite
5. The frontend automatically re-fetches the latest data when the pipeline completes

The button shows a spinning indicator and "Refreshing…" while the pipeline runs. The header updates the **Last updated** timestamp once complete.

### Rate limiting

The refresh endpoint enforces a **5-minute cooldown** between runs to prevent excessive API usage. If you click Refresh Now again too soon, you'll see a message telling you how many seconds remain.

### Clicking items

Every product card and news card is a link that opens the original funko.com page in a new tab.

---

## API Reference

The backend exposes three endpoints, all served from `http://localhost:3001`.

### `GET /api/data`

Returns all stored data from the database.

**Response:**
```json
{
  "new_releases": [ { "id": 1, "title": "...", "price": "$12.99", "image_url": "...", ... } ],
  "back_in_stock": [ { ... } ],
  "news_updates": [ { "id": 1, "headline": "...", "summary": "...", ... } ],
  "last_fetched_at": "2026-03-18T21:00:00.000Z"
}
```

### `GET /api/last-fetched`

Lightweight endpoint returning only the last successful fetch timestamp.

**Response:**
```json
{
  "last_fetched_at": "2026-03-18T21:00:00.000Z",
  "status": "success"
}
```

### `POST /api/refresh`

Triggers the full scrape + persist pipeline. Blocks concurrent runs and enforces a 5-minute rate limit.

**Response (success):**
```json
{
  "status": "success",
  "ran_at": "2026-03-18T21:00:00.000Z",
  "new_items_count": 12,
  "updated_items_count": 3
}
```

**Response (rate limited):** HTTP 429
```json
{ "error": "Rate limited. Try again in 240 seconds." }
```

### `GET /health`

Simple health check.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-03-18T21:00:00.000Z" }
```

---

## Troubleshooting

### `better-sqlite3` fails to install on Windows

**Error:** `error C1189: "C++20 or later required."`

Install Visual Studio Build Tools with the "Desktop development with C++" workload (see [Prerequisites](#prerequisites)), then re-run `npm install` in the backend directory.

---

### Backend starts but immediately crashes

**Check:** Is your `.env` file in the project root (`funko-tracker/`) — not inside the `backend/` folder?

**Check:** Does your `ANTHROPIC_API_KEY` start with `sk-ant-`? Placeholder values like `your_api_key_here` will cause the Anthropic SDK to reject requests.

---

### Frontend shows "Failed to load data"

**Check:** Is the backend running? Open [http://localhost:3001/health](http://localhost:3001/health) in your browser. You should see `{"status":"ok",...}`.

**Check:** Is the backend on port `3001`? The Vite dev proxy expects it there. If you changed `PORT` in `.env`, update the proxy target in `frontend/vite.config.ts` to match.

---

### Playwright / Chromium not found

**Error:** `browserType.launch: Executable doesn't exist`

Run the Playwright install command from inside the `backend/` directory:

```bash
cd backend
npx playwright install chromium
```

---

### Refresh runs but returns empty data

This means funko.com's page structure may have changed and the Playwright scraping selectors need to be updated. Check `backend/src/agents/tools/scrapeTools.ts` — the CSS selectors used to locate products and articles may need to be updated to match the current funko.com DOM.

---

### API key errors during refresh

**Error:** `401 Unauthorized` or `invalid_api_key`

Double-check that your `ANTHROPIC_API_KEY` in `.env` is correct and has not expired. You can verify it in the [Anthropic Console](https://console.anthropic.com).
