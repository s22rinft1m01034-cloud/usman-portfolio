// Vercel serverless function — POST /api/chat
//
// Keeps GROQ_API_KEY server-side only. The browser never sees it.
// Set GROQ_API_KEY (and optionally GROQ_MODEL) as env vars in the Vercel
// project settings for production, or in a local `.env` file for `vercel dev`.

import { persona } from '../src/content.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Checked Groq's current production model list (2026-09-12) — of the
// production-designated (not preview, safe for a live site) chat models,
// openai/gpt-oss-120b is Groq's flagship: noticeably better at staying in
// character over a multi-turn conversation than llama-3.3-70b-versatile
// (the old default), while still running at Groq's usual very-low-latency
// speed. openai/gpt-oss-20b is the faster/cheaper sibling if cost or speed
// ever matters more than reply quality — swap via the GROQ_MODEL env var
// below, no code change needed.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_HISTORY = 12; // most recent messages kept, to bound token usage
const MAX_MESSAGE_LEN = 800;

// Very light per-instance rate limit. Serverless instances are ephemeral and
// can be scaled to multiple copies, so this is a courtesy speed bump, not a
// real defense — put something like Upstash/Vercel KV in front of it if you
// need to actually enforce a limit.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "I'm getting a lot of messages right now — try again in a minute." });
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set');
    return res.status(500).json({ error: 'Chat is not configured yet — the site owner needs to add a Groq API key.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const cleaned = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LEN) }));

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'No user message provided' });
  }

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const payload = {
    model,
    messages: [{ role: 'system', content: persona.systemPrompt }, ...cleaned],
    temperature: 0.7,
    max_tokens: 300,
    // openai/gpt-oss-* models are reasoning models — Groq gives them their own
    // hidden "thinking" pass before the visible reply, and that thinking
    // counts against max_tokens. Verified directly against the API: at the
    // default effort the model spent the entire max_tokens budget reasoning
    // and returned an EMPTY content string (finish_reason: "length"). "low"
    // effort fixes this (short reasoning, real content, finish_reason:
    // "stop") without needing a much bigger max_tokens just to compensate.
    // Only send this to models that actually support it — it 400s ("
    // reasoning_effort is not supported with this model") on every other
    // model family Groq hosts, so this must stay conditional if GROQ_MODEL
    // is ever overridden to something non-gpt-oss.
    ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
  };

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '');
      console.error('Groq API error', groqRes.status, errText);
      return res.status(502).json({ error: "I couldn't reach my brain just now — try again in a moment." });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'Got an empty response — try rephrasing that?' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error', err);
    return res.status(500).json({ error: 'Something went wrong on my end.' });
  }
}
