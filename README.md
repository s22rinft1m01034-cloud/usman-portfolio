# Usman Sabir — Portfolio

Vite + Three.js cinematic portfolio with a custom 3D character that tracks the cursor, docks into a
corner widget on scroll, and answers visitor questions via a Groq-powered chat (kept behind a
Vercel serverless function so the API key never reaches the browser).

## Quick start

```bash
npm install
npm run dev      # frontend only — chat will show a "not reachable" message, that's expected
```

## 1. Add your content

Everything editable lives in **`src/content.js`** — one file, no copy anywhere else. Open it and:

- Confirm/fix `person.linkedin` (currently a **guessed** URL — resume only gave a name, not a link).
- Fill in `person.fiverr` / `person.upwork` if you want those on the site.
- Adjust `summary`, `achievements`, `experience`, `projects`, `skills`, `education`, `courses` as needed.
- `persona.systemPrompt` is what the chat avatar draws on when answering — it's built from the fields
  above automatically, so updating your bio there keeps the chat in sync.

## 2. The 3D character

`src/three/character.js` is a fully custom-built character (primitives + materials, no external
model file) — a small "digital being" with a glowing chest core, two halo rings, and a face that
tracks the cursor and reacts while the chat is "talking". Colors, proportions, and the ring/core
details are all tunable right in that file if you want to adjust the look — no asset pipeline to
worry about, since nothing is loaded from disk.

## 3. Wire up the chat (Groq + Vercel)

The frontend calls `POST /api/chat`. That serverless function (`api/chat.js`) is the only thing that
touches your Groq key — it's never sent to the browser.

**Local testing** (optional — needs the Vercel CLI, since plain `vite dev` doesn't run `/api`):

```bash
npm i -g vercel
cp .env.example .env      # then paste your real GROQ_API_KEY into .env
vercel dev
```

**Production (deploying to Vercel):**

1. Push this project to GitHub (or run `vercel` directly from this folder) and import it on
   [vercel.com](https://vercel.com/new).
2. In the Vercel project's **Settings → Environment Variables**, add:
   - `GROQ_API_KEY` — from https://console.groq.com/keys
   - `GROQ_MODEL` — optional, defaults to `llama-3.3-70b-versatile` if omitted
3. Deploy. Vercel auto-detects the Vite build and the `api/` folder — no extra config needed.

If you'd rather host the frontend somewhere else (Netlify, GitHub Pages, etc.), you'll need to
re-implement `api/chat.js` as that host's equivalent serverless/edge function — the logic is a plain
`fetch` to Groq's OpenAI-compatible endpoint, so it ports easily.

## Project structure

```
index.html              markup + section shells
src/content.js           ← all copy + chat persona (single source of truth)
src/render.js             turns content.js into DOM
src/main.js               orchestrates scroll, reveal animations, docking, wiring
src/style/main.css         theme + layout
src/three/character.js     the 3D character: fully custom-built, cursor-follow, talk animation
src/three/dock.js          scroll-scrubbed shrink/dock of the character into a corner bubble
src/chat/chatWidget.js     chat panel UI + client for /api/chat
api/chat.js                Vercel serverless function → Groq API (server-side key)
```

## Notes / known TODOs

- `person.linkedin` is a guessed slug — confirm the real URL.
- `person.fiverr` / `person.upwork` are blank — add if wanted.
- `GROQ_API_KEY` isn't set anywhere yet — chat will return a friendly "not configured" message until
  it is (locally or in Vercel).
- The chat rate limit in `api/chat.js` is in-memory per serverless instance — a real deterrent needs
  something like Upstash/Vercel KV in front of it; fine for a personal portfolio's traffic levels.
