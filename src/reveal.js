const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    if (en.target.hasAttribute('data-sweep')) $$('.sweep-w', en.target).forEach((w) => w.classList.add('go'));
    en.target.classList.add('in');
    io.unobserve(en.target);
  });
}, { threshold: 0.2 });

/** Splits a heading into words that drop into place, one after another, when it enters the viewport. */
export function sweepify(el, { manual = false } = {}) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  text.split(' ').forEach((word, i, arr) => {
    const w = document.createElement('span');
    w.className = 'sweep-w';
    w.setAttribute('aria-hidden', 'true');
    w.style.setProperty('--d', `${Math.min(i, 14) * 55}ms`);
    w.textContent = word;
    el.append(w);
    if (i < arr.length - 1) el.append(' ');
  });
  // Manual titles drop in when their owner says so (for example when a lesson block becomes active).
  if (!manual) io.observe(el);
}

/** Plays the word drop on a title made with sweepify. */
export const sweepNow = (el) => el.querySelectorAll('.sweep-w').forEach((w) => w.classList.add('go'));
