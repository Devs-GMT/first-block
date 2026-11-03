const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    if (en.target.hasAttribute('data-sweep')) $$('.sweep-c', en.target).forEach((c) => c.classList.add('go'));
    en.target.classList.add('in');
    io.unobserve(en.target);
  });
}, { threshold: 0.2 });

/** Splits a heading into per-character spans so it can sweep in colour when it enters the viewport. */
export function sweepify(el, { manual = false } = {}) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'sweep-w';
    w.setAttribute('aria-hidden', 'true');
    [...word].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'sweep-c';
      c.style.animationDelay = `${Math.min(i, 60) * 25}ms`;
      c.textContent = ch;
      w.append(c);
      i++;
    });
    el.append(w);
    if (wi < arr.length - 1) el.append(' ');
    i++;
  });
  // Manual titles sweep when their owner says so (for example when a lesson block becomes active).
  if (!manual) io.observe(el);
}

/** Runs the colour sweep on a title made with sweepify. */
export const sweepNow = (el) => el.querySelectorAll('.sweep-c').forEach((c) => c.classList.add('go'));
