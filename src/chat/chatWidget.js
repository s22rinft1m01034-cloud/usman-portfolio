// The character's speech bubble + client for /api/chat. Not styled as a
// generic "chat app" — the avatar speaks first (typed out, not pasted in),
// and startTalking()/stopTalking() are tied to the exact typing duration.
import { persona } from '../content.js';

const MAX_SENT_HISTORY = 12;
const GREETING = "Hey, I'm an AI version of Usman — ask me anything, including what a normal day looks like for him.";

export function initChat({ character, dockTrigger }) {
  const panel = document.getElementById('chat-panel');
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const suggestionsEl = document.getElementById('chat-suggestions');
  const closeBtn = document.getElementById('chat-close');
  const dotEl = document.getElementById('chat-dot');

  const history = [];
  let hasOpenedBefore = false;

  function setOnline(online) {
    dotEl?.classList.toggle('offline', !online);
  }

  function appendStatic(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function appendTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant typing-dots';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // Reveals text progressively rather than pasting it in — the avatar is
  // "speaking", not rendering an API response. Speed scales down for longer
  // replies so nothing takes forever to finish typing.
  function typeInto(el, text) {
    return new Promise((resolve) => {
      const delay = Math.max(12, Math.min(38, 1800 / Math.max(text.length, 1)));
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      let i = 0;
      const timer = setInterval(() => {
        i++;
        el.textContent = text.slice(0, i);
        el.appendChild(cursor);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        if (i >= text.length) {
          clearInterval(timer);
          cursor.remove();
          resolve();
        }
      }, delay);
    });
  }

  async function appendSpoken(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    messagesEl.appendChild(div);
    character?.startTalking?.();
    await typeInto(div, text);
    character?.stopTalking?.();
    return div;
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = '';
    persona.suggestedQuestions.forEach((q) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = q;
      chip.addEventListener('click', () => submitMessage(q));
      suggestionsEl.appendChild(chip);
    });
  }

  async function submitMessage(text) {
    const clean = text.trim();
    if (!clean) return;
    appendStatic('user', clean);
    history.push({ role: 'user', content: clean });
    input.value = '';
    input.disabled = true;
    const typingEl = appendTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_SENT_HISTORY) })
      });
      let data = null;
      try { data = await res.json(); } catch { /* non-JSON response */ }
      typingEl.remove();

      if (!res.ok || !data?.reply) {
        const fallback = "Chat isn't reachable right now — this needs the /api/chat serverless function running (use `vercel dev` locally, or it just works once deployed to Vercel with GROQ_API_KEY set).";
        appendStatic('error', data?.error || fallback);
        setOnline(false);
        return;
      }

      history.push({ role: 'assistant', content: data.reply });
      await appendSpoken(data.reply);
      setOnline(true);
    } catch {
      typingEl.remove();
      appendStatic('error', "Couldn't connect — check your connection and try again.");
      setOnline(false);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  function openChat() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
    if (!hasOpenedBefore) {
      hasOpenedBefore = true;
      appendSpoken(GREETING).then(renderSuggestions);
    }
    input.focus();
  }

  function closeChat() {
    panel.classList.remove('open');
    panel.hidden = true;
  }

  dockTrigger?.addEventListener('click', () => {
    if (panel.hidden) openChat(); else closeChat();
  });
  closeBtn.addEventListener('click', closeChat);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage(input.value);
  });

  return { open: openChat, close: closeChat };
}
