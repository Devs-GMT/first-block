import './style.css';
import { MAINNET_CONTRACT, TESTNET_PROGRESS, LINKS } from './config.js';
import { mountLessons } from './lessonApp.js';
import { io, sweepify } from './reveal.js';
import { initWalletUI, initScan, initWall, initGraduates } from './live.js';
import { learnView, lessonView } from './views.js';
import { graduateView, wallView, docView } from './views2.js';

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

/* ---------- Hero: the block path ----------
   Six cubes climb from lesson 1 to graduation. Before a wallet is checked they demo the path, then they show
   that wallet's real progress: grey is locked, light green is next, green has passed, amber is graduation. */
const FACE = { t: '32,5.97 52.95,18.5 32,30.54 11.05,18.5', l: '8.62,21.17 30.79,33.22 30.79,58.27 8.62,45.5', r: '55.38,21.17 55.38,45.5 33.22,58.27 33.22,33.22' };
const cubeSVG = (cls = '') => `<g class="hb ${cls}"><polygon class="t" points="${FACE.t}"/><polygon class="l" points="${FACE.l}"/><polygon class="r" points="${FACE.r}"/></g>`;
const heroPath = (() => {
  const el = $('#heroPath');
  if (!el) return null;
  const NAMES = ['Get set up', 'First transaction', 'Talk to a contract', 'Deploy', 'Make it work', 'Graduate'];
  const X0 = 152, Y0 = 404, DX = 78, DY = -64, S = 1.56;
  const cubes = NAMES.map((name, i) => {
    const x = X0 + DX * i, y = Y0 + DY * i;
    return `<g class="hp ${i === 5 ? 'gold' : ''}" data-i="${i}" transform="translate(${x} ${y})">
      <g class="hp-drop" style="--d:${120 + i * 90}ms"><g transform="scale(${S})">${cubeSVG()}</g></g>
      <text class="hl" x="-14" y="54" text-anchor="end"><tspan class="hl-n">${i === 5 ? '★' : String(i + 1).padStart(2, '0')}</tspan> ${name}</text></g>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 640 520" aria-hidden="true">
    <defs><pattern id="isoDots" width="24" height="13.86" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="13.5" cy="8.43" r="1.3"/></pattern>
      <radialGradient id="isoFade" cx="58%" cy="56%" r="46%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="isoMask"><rect width="640" height="520" fill="url(#isoFade)"/></mask></defs>
    <rect class="iso-grid" width="640" height="520" fill="url(#isoDots)" mask="url(#isoMask)"/>
    <path class="hp-link" d="M${X0 + 50} ${Y0 + 47} ${Array.from({ length: 5 }, (_, i) => `L${X0 + 50 + DX * (i + 1)} ${Y0 + 47 + DY * (i + 1)}`).join(' ')}"/>
    ${cubes}</svg>`;
  const groups = $$('.hp', el);
  let shown = -1;
  const set = (done, { animate = true } = {}) => {
    groups.forEach((g, i) => {
      const was = g.classList.contains('done');
      const now = i < 5 ? i < done : done >= 6;
      g.classList.toggle('done', now);
      g.classList.toggle('cur', !now && i === Math.min(done, 5) && done < 6);
      if (animate && now && !was) { const c = $('.hp-drop', g); c.classList.remove('click'); void c.getBoundingClientRect(); c.classList.add('click'); }
    });
    shown = done;
  };
  set(0, { animate: false });
  let timer = 0, demo = !reduce;
  const step = () => { if (!demo) return; const next = shown >= 6 ? 0 : shown + 1; set(next); timer = setTimeout(step, next === 6 ? 3200 : next === 0 ? 900 : 1300); };
  if (reduce) set(3, { animate: false });
  else {
    el.classList.add('in');
    new IntersectionObserver(([e]) => { clearTimeout(timer); if (e.isIntersecting && demo) timer = setTimeout(step, 1600); }, { threshold: 0.3 }).observe(el);
  }
  return {
    // A checked wallet replaces the demo with its real progress (null while the chain is being read).
    show(done) { demo = false; clearTimeout(timer); el.classList.add('real'); set(done == null ? 0 : done, { animate: done != null }); groups.forEach((g) => g.classList.toggle('wait', done == null)); },
  };
})();
document.addEventListener('fb:blocks', (e) => heroPath?.show(e.detail));

/* ---------- Footer: on phones each link column folds into an accordion ---------- */
(() => {
  const narrow = matchMedia('(max-width: 640px)');
  $$('.foot-cols > div').forEach((col) => {
    const label = $('.mono-label', col);
    if (!label) return;
    const btn = document.createElement('button');
    btn.className = 'fcol-btn'; btn.type = 'button';
    btn.innerHTML = `<span>${label.textContent}</span>${icon('chev', 'xs')}`;
    label.replaceWith(btn);
    const sync = () => { const open = !narrow.matches || col.classList.contains('open'); btn.setAttribute('aria-expanded', open); btn.disabled = !narrow.matches; };
    btn.addEventListener('click', () => { col.classList.toggle('open'); sync(); });
    narrow.addEventListener('change', sync); sync();
  });
})();

/* ---------- Who it's for: small block scenes, one per audience ---------- */
(() => {
  const P = { 0: [[0, 0, 0], [1.15, 0, 0]], 1: [[0, 0, 0], [0, 0, 1], [0, 0, 2]], 2: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]], 3: [[0, 0, 0], [1, 0, 0], [0.5, 0.5, 1]], 4: [[-1.1, 0, 0], [0, -1.1, 0], [1.1, 0, 0], [0, 1.1, 0], [0, 0, 0]] };
  $$('#who .who').forEach((card, k) => {
    const cells = (P[k] || P[0]).map(([gx, gy, gz]) => ({ x: (gx - gy) * 25, y: (gx + gy) * 14.4 - gz * 29, z: gx + gy + gz * 0.01 }))
      .sort((a, b) => a.z - b.z || b.y - a.y);
    const svg = cells.map((c, i) => `<g transform="translate(${c.x} ${c.y}) scale(.8)">${cubeSVG(i === cells.length - 1 ? 'done' : 'ink')}</g>`).join('');
    const art = document.createElement('div');
    art.className = 'who-art'; art.setAttribute('aria-hidden', 'true');
    art.innerHTML = `<svg viewBox="-70 -60 190 150">${svg}</svg>`;
    $('.ic.lg', card)?.remove();
    card.insertBefore(art, $('h3', card));
  });
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
const TITLES = { '/learn': 'Your path', '/graduate': 'Graduate', '/wall': 'Graduates', '/privacy': 'Privacy', '/terms': 'Terms' };
function route() {
  unmount?.(); unmount = null;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/lesson\/([1-5])$/);
  let mount = null, title = 'First Block: your first steps on BOT Chain';
  if (m) { mount = (r) => lessonView(r, +m[1]); title = `Lesson ${m[1]} · First Block`; }
  else if (path === '/learn') { mount = learnView; title = `${TITLES[path]} · First Block`; }
  else if (path === '/graduate') { mount = graduateView; title = `${TITLES[path]} · First Block`; }
  else if (path === '/wall') { mount = wallView; title = `${TITLES[path]} · First Block`; }
  else if (path === '/privacy' || path === '/terms') { mount = (r) => docView(r, path.slice(1)); title = `${TITLES[path]} · First Block`; }
  document.title = title;
  nav.classList.remove('open');
  burger.innerHTML = icon('menu');
  homeEl.hidden = !!mount;
  viewEl.hidden = !mount;
  if (mount) { viewEl.innerHTML = ''; unmount = mount(viewEl); }
}
const isView = (p) => /^\/(learn|graduate|wall|privacy|terms|lesson\/[1-5])\/?$/.test(p);
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
