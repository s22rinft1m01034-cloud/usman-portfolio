
import { persona } from '../content.js';

const MAX_SENT_HISTORY = 12;

const GREETING =
  "Hey, I'm an AI version of Usman — ask me anything, including what a normal day looks like for him.";

export function initChat({ character, dockTrigger }) {
  const panel = document.getElementById('chat-panel');
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const suggestionsEl = document.getElementById('chat-suggestions');
  const closeBtn = document.getElementById('chat-close');
  const dotEl = document.getElementById('chat-dot');

  if (!panel || !messagesEl || !form || !input) {
    console.error('Chatbot elements not found');
    return { open() {}, close() {} };
  }

  const history = [];
  let hasOpenedBefore = false;
  let hasSentMessage = false;
  let isSending = false;

  // ===================================
  // CHAT WINDOW SIZE + SCROLL FIX
  // ===================================

  if (!document.getElementById('chat-layout-fix')) {
    const style = document.createElement('style');
    style.id = 'chat-layout-fix';

    style.textContent = `
      #chat-panel {
        display: flex !important;
        flex-direction: column !important;
        height: min(540px, calc(100dvh - 120px)) !important;
        max-height: calc(100dvh - 120px) !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      #chat-panel[hidden] {
        display: none !important;
      }

      #chat-messages {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain;
        overflow-wrap: anywhere;
        scroll-behavior: auto;
      }

      #chat-suggestions {
        flex-shrink: 0 !important;
        max-height: 160px;
        overflow-y: auto;
      }

      #chat-suggestions[hidden] {
        display: none !important;
      }

      #chat-form {
        flex-shrink: 0 !important;
      }

      #chat-messages .chat-msg {
        height: auto;
        flex-shrink: 0;
        overflow-wrap: anywhere;
      }

      @media (max-width: 600px) {
        #chat-panel {
          height: min(520px, calc(100dvh - 110px)) !important;
          max-height: calc(100dvh - 110px) !important;
          max-width: calc(100vw - 20px) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ===================================
  // AUTO SCROLL TO LATEST MESSAGE
  // ===================================

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;

    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ===================================
  // ONLINE STATUS
  // ===================================

  function setOnline(online) {
    dotEl?.classList.toggle('offline', !online);
  }

  // ===================================
  // ADD NORMAL MESSAGE
  // ===================================

  function appendStatic(role, text) {
    const div = document.createElement('div');

    div.className = `chat-msg ${role}`;
    div.textContent = text;

    messagesEl.appendChild(div);
    scrollToBottom();

    return div;
  }

  // ===================================
  // TYPING DOTS
  // ===================================

  function appendTyping() {
    const div = document.createElement('div');

    div.className = 'chat-msg assistant typing-dots';
    div.innerHTML = '<span></span><span></span><span></span>';

    messagesEl.appendChild(div);
    scrollToBottom();

    return div;
  }

  // ===================================
  // ANIMATED AI TEXT
  // ===================================

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

        // Keep latest AI text visible
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

  // ===================================
  // AI SPEAKING ANIMATION
  // ===================================

  async function appendSpoken(text) {
    const div = document.createElement('div');

    div.className = 'chat-msg assistant';
    messagesEl.appendChild(div);

    scrollToBottom();

    character?.startTalking?.();

    try {
      await typeInto(div, text);
    } finally {
      character?.stopTalking?.();
    }

    scrollToBottom();

    return div;
  }

  // ===================================
  // HIDE SUGGESTED QUESTIONS
  // ===================================

  function hideSuggestions() {
    hasSentMessage = true;

    if (suggestionsEl) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.hidden = true;
    }

    scrollToBottom();
  }

  // ===================================
  // SHOW SUGGESTIONS FIRST TIME ONLY
  // ===================================

  function renderSuggestions() {
    if (!suggestionsEl || hasSentMessage) return;

    suggestionsEl.innerHTML = '';
    suggestionsEl.hidden = false;

    persona.suggestedQuestions.forEach((q) => {
      const chip = document.createElement('button');

      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = q;

      chip.addEventListener('click', () => {
        submitMessage(q);
      });

      suggestionsEl.appendChild(chip);
    });

    scrollToBottom();
  }

  // ===================================
  // SEND MESSAGE TO GROQ API
  // ===================================

  async function submitMessage(text) {
    const clean = text?.trim();

    if (!clean || isSending) return;

    isSending = true;

    // Remove suggestions after first message
    hideSuggestions();

    // Show user's message
    appendStatic('user', clean);

    history.push({
      role: 'user',
      content: clean
    });

    input.value = '';
    input.disabled = true;

    scrollToBottom();

    // Show typing animation
    const typingEl = appendTyping();

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
          "Chat isn't reachable right now — check the /api/chat function and GROQ_API_KEY.";

        appendStatic('error', data?.error || fallback);
        setOnline(false);
        return;
      }

      // Save AI response
      history.push({
        role: 'assistant',
        content: data.reply
      });

      // Display animated response
      await appendSpoken(data.reply);

      setOnline(true);
      scrollToBottom();

    } catch (error) {
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

  // ===================================
  // OPEN CHATBOT
  // ===================================

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
    scrollToBottom();
  }

  // ===================================
  // CLOSE CHATBOT
  // ===================================

  function closeChat() {
    panel.classList.remove('open');
    panel.hidden = true;
  }

  // ===================================
  // AVATAR BUTTON
  // ===================================

  dockTrigger?.addEventListener('click', () => {
    if (panel.hidden) {
      openChat();
    } else {
      closeChat();
    }
  });

  // ===================================
  // CLOSE BUTTON
  // ===================================

  closeBtn?.addEventListener('click', closeChat);

  // ===================================
  // FORM SUBMIT
  // ===================================

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage(input.value);
  });

  return {
    open: openChat,
    close: closeChat
  };
}
