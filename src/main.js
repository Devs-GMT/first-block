import './style.css';
import { MAINNET_CONTRACT, TESTNET_PROGRESS, LINKS } from './config.js';
import { mountLessons } from './lessonApp.js';
import { io, sweepify } from './reveal.js';
import { initWalletUI, initScan, initWall, initGraduates } from './live.js';
import { learnView, lessonView } from './views.js';
import { graduateView, wallView } from './views2.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Nav ---------- */
const nav = $('#nav');
$$('.dd').forEach((dd) => {
  const btn = $('.nav-btn', dd);
  const close = () => { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const open = () => { $$('.dd.open').forEach((o) => o !== dd && o.classList.remove('open')); dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
  btn.addEventListener('click', () => (dd.classList.contains('open') ? close() : open()));
  dd.addEventListener('mouseenter', () => matchMedia('(hover:hover)').matches && open());
  dd.addEventListener('mouseleave', close);
  $$('.menu a', dd).forEach((a) => a.addEventListener('click', () => {
    close();
    if (a.dataset.tab) setTimeout(() => selectTab(+a.dataset.tab), 0);
  }));
});
document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) $$('.dd.open').forEach((d) => d.classList.remove('open')); });
// Lessons mega menu: hovering or focusing an item shows its animated preview (restarted each time).
$$('.mega').forEach((m) => {
  const items = $$('.mega-list a', m), prevs = $$('.mp', m);
  const show = (i) => {
    items.forEach((x, n) => x.classList.toggle('on', n === i));
    prevs.forEach((p, n) => { p.classList.remove('on'); if (n === i) { void p.offsetWidth; p.classList.add('on'); } });
  };
  items.forEach((x, i) => { x.addEventListener('mouseenter', () => show(i)); x.addEventListener('focus', () => show(i)); });
  m.closest('.dd').addEventListener('mouseenter', () => show(0));
  m.closest('.dd').querySelector('.nav-btn').addEventListener('click', () => show(0));
});
const burger = $('#burger');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
  burger.innerHTML = icon(open ? 'x' : 'menu');
});
$$('#sheet a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); burger.innerHTML = icon('menu'); }));

/* ---------- Title sweep + reveal ---------- */
$$('[data-sweep]').forEach(sweepify);
$$('.reveal').forEach((el) => io.observe(el));

/* ---------- Hero dial: a dotted dome with a comet that travels along it ---------- */
(() => {
  const cv = $('#dial');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const TICKS = 15, GAP = 16;
  let w = 0, h = 0, dpr = 1, on = true, raf = 0, geo = null;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = Math.max(w * 0.46, 320), cx = w / 2, cy = 30 + r;
    const cut = Math.asin(Math.min(Math.max((cy - h) / r, 0), 0.98)) * 180 / Math.PI;
    const a0 = 180 + cut, a1 = 360 - cut;
    const n = Math.max(12, Math.floor((r * (a1 - a0) * Math.PI / 180) / GAP));
    geo = { r, cx, cy, a0, a1, n };
  };
  const draw = (time) => {
    ctx.clearRect(0, 0, w, h);
    const { r, cx, cy, a0, a1, n } = geo;
    const phase = reduce ? 0.4 : time / 1000 * 0.32;
    const head = 0.5 - 0.5 * Math.cos(phase);
    const dir = Math.sin(phase) >= 0 ? 1 : -1;
    const at = (u, inset = 0) => { const a = ((a0 + (a1 - a0) * u) * Math.PI) / 180; return [cx + Math.cos(a) * (r - inset), cy + Math.sin(a) * (r - inset)]; };
    const hi = head * (n - 1);
    for (let i = 0; i < n; i++) {
      const di = (i - hi) * dir;
      const [x, y] = at(i / (n - 1));
      let size = 2.6, color = 'rgba(30,29,28,0.3)';
      if (Math.abs(di) < 0.6) { size = 8; color = '#1e1d1c'; }
      else if (di < 0 && di > -20) { const k = 1 + di / 20; size = 2.6 + 3 * k; color = `rgba(31,169,113,${0.3 + 0.7 * k})`; }
      else if (di > 0 && di < 9) { const k = 1 - di / 9; size = 2.6 + 2.4 * k; color = `rgba(120,117,111,${0.4 + 0.4 * k})`; }
      ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.2832); ctx.fillStyle = color; ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < TICKS; i++) {
      const u = (i + 0.5) / TICKS, k = Math.max(0, 1 - Math.abs(u - head) / 0.1);
      const [x1, y1] = at(u, 96), [x2, y2] = at(u, 146 + 18 * k);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(30,29,28,${0.14 + 0.6 * k})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
  };
  const loop = (t) => { draw(t); if (on && !reduce) raf = requestAnimationFrame(loop); };
  resize(); draw(0);
  addEventListener('resize', () => { resize(); if (reduce) draw(0); });
  new IntersectionObserver(([e]) => { on = e.isIntersecting; cancelAnimationFrame(raf); if (on && !reduce) raf = requestAnimationFrame(loop); }).observe(cv);
})();

/* ---------- Hero: animated "Your path" window ---------- */
(() => {
  const card = $('#jcard');
  if (!card) return;
  const nodes = $$('.jn', card), num = $('#jcNum'), line = $('#jcLine'), xp = $('#jcXp');
  const MSG = ['Wallet has gas. Lesson 1 passed.', 'Transaction recorded. Lesson 2 passed.', 'Hello written to the chain. Lesson 3 passed.', 'Counter deployed and owned by you. Lesson 4 passed.', 'Count reached 3. Lesson 5 passed.', 'Graduated on BOT Chain mainnet.'];
  const set = (d) => {
    nodes.forEach((n, i) => {
      n.classList.toggle('done', i < d);
      n.classList.toggle('cur', i === d);
      $('.jn-dot', n).innerHTML = i < d ? icon('check', 'sm') : i === 5 ? icon('cap', 'sm') : String(i + 1);
    });
    num.textContent = d >= 6 ? 'Graduated' : `${Math.min(d, 5)} of 5`;
    line.innerHTML = d ? `${icon('check', 'sm')}${MSG[d - 1]}` : 'Each block unlocks the next.';
    xp.classList.remove('on'); if (d && d < 6) { void xp.offsetWidth; xp.classList.add('on'); }
  };
  set(0);
  if (reduce) { set(3); return; }
  let t = 0, d = 0;
  const tick = () => { if (d > 6) d = 0; set(d); d++; t = setTimeout(tick, d === 7 ? 3400 : 1500); };
  new IntersectionObserver(([e]) => { clearTimeout(t); if (e.isIntersecting) tick(); }, { threshold: 0.3 }).observe(card);
})();

/* ---------- Lessons ---------- */
const lessons = mountLessons({ app: $('#lApp'), tabs: $$('#tabs button'), left: $('#lLeft') });
function selectTab(i) { lessons.goTo(i); }

/* ---------- Glossary ---------- */
const WORDS = [
  ['wallet', 'Wallet', 'An app that holds your keys and signs transactions for you.'],
  ['network', 'Network', 'The chain your wallet is talking to, such as BOT Chain Testnet.'],
  ['drop', 'Faucet', 'A site that gives you free test BOT so you can pay for gas.'],
  ['gas', 'Gas', 'The small fee paid to have a transaction included in a block.'],
  ['send', 'Transaction', 'A signed message that changes something on the chain.'],
  ['cube', 'Block', 'A batch of transactions the chain seals together.'],
  ['search', 'Explorer', 'A website where anyone can look up transactions and addresses.'],
  ['doc', 'Contract', 'Code that lives at an address on the chain and runs as written.'],
  ['func', 'Function', 'A named action a contract lets you call.'],
  ['bell', 'Event', 'A log a contract emits so apps can read what happened.'],
  ['flask', 'Testnet', 'A practice chain where the coins are free and mistakes are cheap.'],
  ['shield', 'Mainnet', 'The real chain, where BOT has value. Graduation lives here.'],
];
const GROUP = { Wallet: 'g', Network: 'g', Faucet: 'g', Gas: 'g', Transaction: 'b', Block: 'b', Explorer: 'b', Contract: 'v', Function: 'v', Event: 'v', Testnet: 'a', Mainnet: 'a' };
// Where each word first comes up in the course (shown on the back of the tile).
const USED = { Wallet: ['L1', 'Lesson 1 · Get set up'], Network: ['L1', 'Lesson 1 · Get set up'], Faucet: ['L1', 'Lesson 1 · Get set up'], Gas: ['L1', 'Lesson 1 · Get set up'], Transaction: ['L2', 'Lesson 2 · First transaction'], Block: ['L2', 'Lesson 2 · First transaction'], Explorer: ['L2', 'Lesson 2 · First transaction'], Contract: ['L3', 'Lessons 3 and 4 · Contracts'], Function: ['L3', 'Lesson 3 · Talk to a contract'], Event: ['L3', 'Lesson 3 · Talk to a contract'], Testnet: ['L1–5', 'Every lesson runs on testnet'], Mainnet: ['Grad', 'Graduation, one mainnet transaction'] };
$('#tiles').innerHTML = WORDS.map(([ic, name, def]) => `<button class="tile reveal t-${GROUP[name]}" aria-label="${name}: ${def} Used in ${USED[name][1]}."><span class="tile-in"><span class="tile-f"><span class="tile-top">${icon(ic)}<i class="tile-tag">${USED[name][0]}</i></span><b>${name}</b><span class="tile-def">${def}</span></span><span class="tile-b"><span class="tile-k">Where you'll use it</span><b>${USED[name][1]}</b></span></span></button>`).join('');
$$('.tile').forEach((t) => { io.observe(t); t.addEventListener('click', () => t.classList.toggle('flip')); });

/* ---------- Live demo stream (example hellos until the contract is live) ---------- */
(() => {
  const list = $('#demoList');
  if (!list || TESTNET_PROGRESS) return;
  const EX = ['Ada', 'Lin', 'Sam', 'Noor', 'Eko', 'Mina', 'Theo', 'Zara'];
  let n = 0;
  const add = () => {
    const li = document.createElement('li');
    li.className = 'new';
    li.innerHTML = `<b>${EX[n % EX.length]}</b><span class="mono">example</span>`;
    list.prepend(li); n++;
    while (list.children.length > 4) list.lastElementChild.remove();
    setTimeout(() => li.classList.remove('new'), 1400);
  };
  [2, 1, 0].forEach((k) => { n = k; add(); }); n = 3;
  if (reduce) return;
  let t = 0;
  new IntersectionObserver(([e]) => { clearInterval(t); if (e.isIntersecting) t = setInterval(add, 2200); }, { threshold: 0.3 }).observe(list);
})();

/* ---------- FAQ ---------- */
const FAQ = [
  ['Is it free?', 'The five lessons run on BOT Chain testnet, which is free. Graduating happens on mainnet and costs a tiny bit of real BOT for gas.'],
  ['Do I need to know how to code?', 'No. You read a 15-line contract and deploy it from a button. You\'ll understand what each line does by the end.'],
  ['Is my wallet safe?', 'First Block never asks for a seed phrase or private key, and there are no approvals or token permissions. You only sign normal transactions. Never share your recovery phrase with anyone, including us.'],
  ['What if I get stuck?', 'Every lesson has a Stuck? button with the three most common fixes, and a link to BOTGuide for the rest.'],
  ['What does Verified mean?', 'Mainnet can\'t read testnet, so the website unlocks graduate() after you pass 5 of 5. On the graduates wall, a Verified badge appears only when the testnet Progress contract confirms 5 of 5 for that wallet, checked live. Anyone else is shown as Self-reported.'],
  ['Can I redo a lesson?', 'Yes. A finished lesson shows your transaction link and a Redo for practice button. Redoing never undoes your progress.'],
];
$('#faqList').innerHTML = FAQ.map(([q, a], i) => `<div class="q reveal${i === 0 ? ' open' : ''}"><button aria-expanded="${i === 0}">${q}${icon('plus')}</button><div class="q-a"><div><p>${a}</p></div></div></div>`).join('');
$$('.q').forEach((q) => { io.observe(q); $('button', q).addEventListener('click', () => { const o = q.classList.toggle('open'); $('button', q).setAttribute('aria-expanded', o); }); });

/* ---------- Helper ---------- */
const HELP = [
  ['My wallet shows the wrong network', 'Open MetaMask, tap the network name at the top, and pick BOT Chain Testnet (chain ID 968). If it\'s missing, press Add network in lesson 1.'],
  ['Faucet isn\'t working', 'The faucet gives 10 test BOT per address every 24 hours. Check you pasted the right address, and try again later if you already claimed today.'],
  ['Transaction failed', 'Make sure you\'re on testnet and have some test BOT for gas. If MetaMask says the transaction was rejected, press the button again and confirm.'],
];
const hb = $('#helperBtn'), hp = $('#helperPanel'), ha = $('#helperA');
$('#helperQ').innerHTML = HELP.map(([q], i) => `<button data-i="${i}"><span>${q}</span>${icon('chev', 'xs')}</button>`).join('');
const toggleHelp = (open) => { hp.hidden = !open; hb.setAttribute('aria-expanded', open); hb.classList.toggle('open', open); };
hb.addEventListener('click', () => toggleHelp(hp.hidden));
$('#helperX').addEventListener('click', () => toggleHelp(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !hp.hidden) toggleHelp(false); });
$$('#helperQ button').forEach((b) => b.addEventListener('click', () => {
  $$('#helperQ button').forEach((x) => x.classList.toggle('on', x === b));
  ha.textContent = HELP[+b.dataset.i][1]; ha.hidden = false;
}));

/* ---------- Wallet, wallet check, wall and graduates (live.js) ---------- */
initWalletUI();
initScan();
initWall();
initGraduates();

/* ---------- Router: home plus /learn, /lesson/1-5, /graduate, /wall ---------- */
const homeEl = $('#home'), viewEl = $('#view');
let unmount = null;
const TITLES = { '/learn': 'Your path', '/graduate': 'Graduate', '/wall': 'Graduates' };
function route() {
  unmount?.(); unmount = null;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/lesson\/([1-5])$/);
  let mount = null, title = 'First Block: your first steps on BOT Chain';
  if (m) { mount = (r) => lessonView(r, +m[1]); title = `Lesson ${m[1]} · First Block`; }
  else if (path === '/learn') { mount = learnView; title = `${TITLES[path]} · First Block`; }
  else if (path === '/graduate') { mount = graduateView; title = `${TITLES[path]} · First Block`; }
  else if (path === '/wall') { mount = wallView; title = `${TITLES[path]} · First Block`; }
  document.title = title;
  nav.classList.remove('open');
  burger.innerHTML = icon('menu');
  homeEl.hidden = !!mount;
  viewEl.hidden = !mount;
  if (mount) { viewEl.innerHTML = ''; unmount = mount(viewEl); }
}
const isView = (p) => /^\/(learn|graduate|wall|lesson\/[1-5])\/?$/.test(p);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const href = a.getAttribute('href');
  if (href.startsWith('/') && isView(href)) {
    e.preventDefault();
    history.pushState({}, '', href); route(); scrollTo(0, 0);
  } else if (href.startsWith('#') && href.length > 1 && !viewEl.hidden) {
    e.preventDefault();
    history.pushState({}, '', '/' + href); route();
    requestAnimationFrame(() => document.querySelector(href)?.scrollIntoView());
  } else if (href === '/' && !viewEl.hidden) {
    e.preventDefault(); history.pushState({}, '', '/'); route(); scrollTo(0, 0);
  }
});
addEventListener('popstate', route);
route();

/* ---------- Footer config ---------- */
if (MAINNET_CONTRACT) {
  $('#addrText').textContent = `${MAINNET_CONTRACT.slice(0, 6)}…${MAINNET_CONTRACT.slice(-4)}`;
  $('#explorerBtn').href = `${LINKS.mainnetExplorer}/address/${MAINNET_CONTRACT}`;
  $('#copyAddr').addEventListener('click', () => navigator.clipboard?.writeText(MAINNET_CONTRACT));
} else {
  $('#copyAddr').disabled = true;
  $('#copyAddr .ic').style.display = 'none';
  $('#copyAddr').style.cursor = 'default';
}
