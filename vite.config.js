import fs from 'node:fs';
import { defineConfig } from 'vite';

// Dev-only convenience: plain `vite dev` doesn't know about Vercel's
// serverless functions, so /api/chat 404s under `npm run dev` even with a
// real GROQ_API_KEY in .env — the widget then shows "Chat isn't reachable
// right now". Rather than requiring `vercel dev` (needs Vercel login +
// linking a project) just to test the chat locally, this plugin makes the
// same dev server also handle POST /api/chat by calling the real
// api/chat.js handler directly. Production is untouched — Vercel serves
// api/chat.js natively once deployed; this block only exists in dev mode.
function apiChatDevMiddleware() {
  return {
    name: 'api-chat-dev-middleware',
    apply: 'serve', // dev only — never runs during `vite build`/`vite preview`
    configureServer(server) {
      // .env isn't loaded into process.env by plain `vite dev` (Vite only
      // exposes VITE_-prefixed vars to client code via import.meta.env) —
      // load it manually so api/chat.js sees GROQ_API_KEY/GROQ_MODEL same
      // as it would from Vercel's real env vars.
      try {
        const envText = fs.readFileSync('.env', 'utf8');
        for (const line of envText.split('\n')) {
          const m = line.match(/^([A-Z_]+)=(.*)$/);
          if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
        }
      } catch {
        // no .env file yet — fine, api/chat.js already handles a missing key gracefully
      }

      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', async () => {
          try {
            const { default: handler } = await import('./api/chat.js');
            const mockRes = {
              setHeader: (k, v) => res.setHeader(k, v),
              status(code) { res.statusCode = code; return this; },
              json(obj) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(obj));
              }
            };
            await handler({ method: 'POST', headers: req.headers, socket: req.socket, body: raw }, mockRes);
          } catch (err) {
            console.error('[api-chat-dev-middleware]', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Dev middleware error — see terminal' }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [apiChatDevMiddleware()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: false
  }
});
