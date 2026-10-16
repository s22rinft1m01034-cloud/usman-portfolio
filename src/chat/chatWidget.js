
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
  let hasSentMessage = false;
  let isSending = false;

  // Scroll to latest message without changing any CSS
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;

    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function setOnline(online) {
    dotEl?.classList.toggle('offline', !online);
  }

  function appendStatic(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;

    messagesEl.appendChild(div);
    scrollToBottom();

    return div;
  }

  function appendTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant typing-dots';
    div.innerHTML = '<span></span><span></span><span></span>';

    messagesEl.appendChild(div);
    scrollToBottom();

    return div;
  }

  // Original typing animation preserved
  function typeInto(el, text) {
    return new Promise((resolve) => {
      const delay = Math.max(
        12,
        Math.min(38, 1800 / Math.max(text.length, 1))
      );

      const cursor = document.createElement('span');
      cursor.className = 'cursor';

      let i = 0;

      const timer = setInterval(() => {
        i++;

        el.textContent = text.slice(0, i);
        el.appendChild(cursor);

        // Automatically follow AI response
        scrollToBottom();

        if (i >= text.length) {
          clearInterval(timer);
          cursor.remove();
          scrollToBottom();
          resolve();
        }
      }, delay);
    });
  }

  // Original avatar speaking functionality
  async function appendSpoken(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';

    messagesEl.appendChild(div);

    character?.startTalking?.();

    try {
      await typeInto(div, text);
    } finally {
      character?.stopTalking?.();
    }

    scrollToBottom();

    return div;
  }

  // FIX 1: Hide questions after first message
  function hideSuggestions() {
    hasSentMessage = true;

    if (suggestionsEl) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.style.display = 'none';
    }

    scrollToBottom();
  }

  // Original suggested questions design preserved
  function renderSuggestions() {
    if (!suggestionsEl || hasSentMessage) return;

    suggestionsEl.innerHTML = '';
    suggestionsEl.style.removeProperty('display');

    persona.suggestedQuestions.forEach((q) => {
      const chip = document.createElement('button');

      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = q;

      chip.addEventListener('click', () => submitMessage(q));

      suggestionsEl.appendChild(chip);
    });
  }

  // Send user messages to existing API
  async function submitMessage(text) {
    const clean = text.trim();

    if (!clean || isSending) return;

    isSending = true;

    // Hide initial questions and free their space
    hideSuggestions();

    appendStatic('user', clean);

    history.push({
      role: 'user',
      content: clean
    });

    input.value = '';
    input.disabled = true;

    const typingEl = appendTyping();

    scrollToBottom();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: history.slice(-MAX_SENT_HISTORY)
        })
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      typingEl.remove();

      if (!res.ok || !data?.reply) {
        const fallback =
          "Chat isn't reachable right now — this needs the /api/chat serverless function running (use `vercel dev` locally, or it just works once deployed to Vercel with GROQ_API_KEY set).";

        appendStatic('error', data?.error || fallback);
        setOnline(false);
        return;
      }

      history.push({
        role: 'assistant',
        content: data.reply
      });

      // AI reply with original typing and avatar animation
      await appendSpoken(data.reply);

      setOnline(true);
      scrollToBottom();

    } catch {
      typingEl.remove();

      appendStatic(
        'error',
        "Couldn't connect — check your connection and try again."
      );

      setOnline(false);

    } finally {
      isSending = false;
      input.disabled = false;
      input.focus();
      scrollToBottom();
    }
  }

  // Original chat opening behavior
  function openChat() {
    panel.hidden = false;

    requestAnimationFrame(() => {
      panel.classList.add('open');
      scrollToBottom();
    });

    if (!hasOpenedBefore) {
      hasOpenedBefore = true;

      appendSpoken(GREETING).then(() => {
        if (!hasSentMessage) {
          renderSuggestions();
        }
      });
    }

    input.focus();
  }

  // Original close behavior
  function closeChat() {
    panel.classList.remove('open');
    panel.hidden = true;
  }

  // Character avatar trigger
  dockTrigger?.addEventListener('click', () => {
    if (panel.hidden) {
      openChat();
    } else {
      closeChat();
    }
  });

  // Close button
  closeBtn.addEventListener('click', closeChat);

  // Message submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage(input.value);
  });

  return {
    open: openChat,
    close: closeChat
  };
}
