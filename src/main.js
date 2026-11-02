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

/* ---------- Hero app preview: a scripted, looping walkthrough ---------- */
(() => {
  const app = $('#app');
  if (!app) return;
  const chat = $('#chat'), comp = $('#composer'), typed = $('#typed'), send = $('#sendBtn'), cur = $('#vcursor');
  const msgs = $('#msgs'), tx = $('#tx'), bar = $('#progBar'), num = $('#progNum');
  const dots = $$('#pdots .d'), steps = $$('.st', app);
  const setDots = (s) => dots.forEach((d, i) => { d.className = 'd ' + (s[i] || ''); });
  const BEFORE = ['done', 'done', 'cur', '', '', 'gold'], AFTER = ['done', 'done', 'done', 'cur', '', 'gold'];
  const reset = () => {
    steps.forEach((e) => e.classList.remove('show'));
    msgs.classList.remove('out'); tx.classList.remove('ok');
    $('.tx-state', tx).textContent = 'Sending…';
    comp.className = 'composer'; typed.textContent = ''; send.className = 'send';
    cur.classList.remove('on'); bar.style.width = '40%'; num.textContent = '2 / 5'; setDots(BEFORE);
  };
  const finalState = () => {
    steps.forEach((e) => e.classList.add('show')); tx.classList.add('ok');
    $('.tx-state', tx).textContent = 'Confirmed'; bar.style.width = '60%'; num.textContent = '3 / 5'; setDots(AFTER);
  };
  const show = (n) => steps.filter((e) => e.dataset.s === String(n)).forEach((e) => e.classList.add('show'));
  const moveTo = (el, dx = 0, dy = 0) => {
    const c = chat.getBoundingClientRect(), r = el.getBoundingClientRect();
    cur.style.transform = `translate(${r.left - c.left + r.width / 2 + dx}px, ${r.top - c.top + r.height / 2 + dy}px)`;
  };
  let run = 0;
  const play = async () => {
    const tok = ++run;
    const w = (ms) => new Promise((res, rej) => setTimeout(() => (tok === run ? res() : rej()), ms));
    try {
      for (;;) {
        reset();
        const c = chat.getBoundingClientRect();
        cur.style.transition = 'none'; cur.style.transform = `translate(${c.width - 120}px, ${c.height - 20}px)`; void cur.offsetWidth; cur.style.transition = '';
        await w(600); show(1);
        await w(1500); cur.classList.add('on'); moveTo($('#ph'), 40, 4);
        await w(1100); comp.classList.add('focus');
        for (const ch of 'Ada') { await w(190); typed.textContent += ch; comp.classList.add('typing'); }
        send.classList.add('go');
        await w(800); moveTo(send, 2, 2);
        await w(1000); send.classList.add('pop');
        await w(180); send.classList.remove('pop'); comp.classList.remove('focus', 'typing'); typed.textContent = ''; send.classList.remove('go'); show(2);
        await w(300); moveTo(chat, 80, -40);
        await w(500); show(3);
        await w(1800); tx.classList.add('ok'); $('.tx-state', tx).textContent = 'Confirmed';
        bar.style.width = '60%'; num.textContent = '3 / 5'; setDots(AFTER); show(5);
        await w(1000); show(4); cur.classList.remove('on');
        await w(5200); msgs.classList.add('out');
        await w(900);
      }
    } catch (_) { /* cancelled */ }
  };
  if (reduce) { finalState(); return; }
  reset();
  new IntersectionObserver(([e]) => { if (e.isIntersecting) play(); else { run++; } }, { threshold: 0.35 }).observe(app);
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
$('#tiles').innerHTML = WORDS.map(([ic, name, def]) => `<button class="tile reveal" aria-label="${name}: ${def}"><span class="tile-in"><span class="tile-f">${icon(ic)}<b>${name}</b></span><span class="tile-b">${def}</span></span></button>`).join('');
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
$('#helperQ').innerHTML = HELP.map(([q], i) => `<button data-i="${i}">${q}</button>`).join('');
hb.addEventListener('click', () => { hp.hidden = !hp.hidden; hb.setAttribute('aria-expanded', !hp.hidden); });
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
  $('#addrText').textContent = `chain ID 677 · ${MAINNET_CONTRACT.slice(0, 6)}…${MAINNET_CONTRACT.slice(-4)}`;
  $('#explorerBtn').href = `${LINKS.mainnetExplorer}/address/${MAINNET_CONTRACT}`;
  $('#copyAddr').addEventListener('click', () => navigator.clipboard?.writeText(MAINNET_CONTRACT));
} else {
  $('#copyAddr').disabled = true;
  $('#copyAddr').style.cursor = 'default';
}
