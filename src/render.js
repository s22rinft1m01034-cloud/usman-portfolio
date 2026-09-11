// Builds all data-driven DOM from content.js. No copy lives in this file.
import {
  person, summary, achievements, aboutHighlights, experience, projects, skills, marqueeItems, stats
} from './content.js';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function renderAll() {
  // Marquee — duplicate the list once so `translateX(-50%)` loops seamlessly.
  const track = document.getElementById('marquee-track');
  if (track) {
    const items = [...marqueeItems, ...marqueeItems]
      .map((i) => `<span class="marquee-item">${i}</span>`)
      .join('');
    track.innerHTML = items;
  }

  // About
  document.querySelector('.about-summary').textContent = summary.replace(/\s+/g, ' ').trim();
  const highlightsGrid = document.getElementById('about-highlights');
  aboutHighlights.forEach((h) => {
    highlightsGrid.appendChild(el(`
      <div class="highlight-card" data-reveal>
        <span class="highlight-icon">${h.icon}</span>
        <h3>${h.title}</h3>
        <p>${h.text}</p>
      </div>
    `));
  });
  const achList = document.querySelector('.about-achievements');
  achievements.forEach((a) => achList.appendChild(el(`<li>${a}</li>`)));

  // Stats — starts at 0, src/countup.js animates it up to data-count-to
  // once it scrolls into view.
  const statRow = document.getElementById('stat-row');
  stats.forEach((s) => {
    statRow.appendChild(el(`
      <div class="stat" data-reveal>
        <div class="stat-value" data-count-to="${s.value}" data-suffix="${s.suffix}">0${s.suffix}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `));
  });

  // (The visible Fiverr rating badge and the text-pill "mini-badges" row
  // that used to sit here were both removed per user feedback — that real
  // Fiverr data (rating, review count, response time, languages) still lives
  // in `fiverrCredibility` and feeds the chat persona; the "real impact" ask
  // is served by actual portfolio screenshots in the project cards below.)

  // Experience
  const expList = document.getElementById('experience-list');
  experience.forEach((e) => {
    expList.appendChild(el(`
      <div class="timeline-item" data-reveal>
        <p class="role">${e.role} · ${e.company}</p>
        <p class="meta">${e.period} — ${e.location}</p>
        <ul>${e.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>
    `));
  });

  // Projects — a project with a real portfolio screenshot (image) gets it
  // rendered as a card-topping thumbnail, for actual visual proof instead of
  // just claimed bullet points.
  const projectGrid = document.getElementById('project-grid');
  projects.forEach((p, i) => {
    projectGrid.appendChild(el(`
      <div class="project-card" data-reveal>
        ${p.image ? `<div class="project-thumb-wrap"><img class="project-thumb" src="${p.image}" alt="${p.title} — portfolio screenshot" loading="lazy" /></div>` : ''}
        <p class="project-meta">${String(i + 1).padStart(2, '0')} · ${p.category}</p>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <ul>${p.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        ${p.link ? `<a class="project-link" href="${p.link}" target="_blank" rel="noopener">Visit site ↗</a>` : ''}
      </div>
    `));
  });

  // Skills
  const skillsGrid = document.getElementById('skills-grid');
  skills.forEach((group) => {
    skillsGrid.appendChild(el(`
      <div class="skill-card" data-reveal>
        <h3>${group.category}</h3>
        <div class="pill-row">${group.items.map((i) => `<span class="pill">${i}</span>`).join('')}</div>
      </div>
    `));
  });

  // Education & Courses section was removed from the page per user request —
  // education/courses data stays in content.js (imported below) since the
  // chat persona's system prompt still draws on it.

  // Contact
  const contactLinks = document.getElementById('contact-links');
  const links = [
    { label: person.email, href: `mailto:${person.email}`, icon: '✉️' },
    { label: person.phone, href: `tel:${person.phone.replace(/\s+/g, '')}`, icon: '📞' },
    { label: 'WhatsApp', href: person.whatsapp, icon: '💬' },
    { label: 'LinkedIn', href: person.linkedin, icon: '🔗' }
  ].filter((l) => l.href && !l.href.endsWith('undefined'));
  links.forEach((l) => {
    contactLinks.appendChild(el(`
      <a class="contact-link" href="${l.href}" target="_blank" rel="noopener">
        <span>${l.icon}</span><span class="contact-link-label">${l.label}</span><span class="contact-link-arrow">↗</span>
      </a>
    `));
  });

  document.getElementById('year').textContent = new Date().getFullYear();
}
