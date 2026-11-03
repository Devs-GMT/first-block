import './style.css';
import { MAINNET_CONTRACT, TESTNET_PROGRESS, LINKS } from './config.js';
import { graduationRead, onWallet, progressRead, short, withRetry } from './chain.js';
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

/* ---------- Hero: a field of blocks ----------
   The grid fills the hero and fades out behind the copy. Now and then one block "gets mined" and lights up. */
(() => {
  const el = $('#heroField');
  if (!el) return;
  let w = 0, h = 0, timer = 0, on = true;
  const build = () => {
    const cw = el.clientWidth, ch = el.clientHeight;
    if (!cw || !ch || (cw === w && ch === h)) return;
    w = cw; h = ch;
    const small = cw < 900, S = small ? 38 : 58, G = small ? 6 : 8, p = S + G;
    const cols = Math.ceil(cw / p) + 1, rows = Math.ceil(ch / p) + 1;
    el.style.setProperty('--s', `${S}px`); el.style.setProperty('--g', `${G}px`);
    el.style.gridTemplateColumns = `repeat(${cols}, ${S}px)`; el.style.gridAutoRows = `${S}px`;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    el.innerHTML = Array.from({ length: cols * rows }, () => { const v = rnd(); return `<i class="fc${v > 0.9 ? ' g2' : v > 0.78 ? ' g1' : ''}"></i>`; }).join('');
  };
  const mine = () => {
    const cells = el.children;
    if (on && cells.length) { const c = cells[Math.floor(Math.random() * cells.length)]; if (!c.classList.contains('mine')) { c.classList.add('mine'); c.addEventListener('animationend', () => c.classList.remove('mine'), { once: true }); } }
    timer = setTimeout(mine, 650 + Math.random() * 700);
  };
  build();
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });
  if (!reduce) { new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el); timer = setTimeout(mine, 1200); }
})();

/* ---------- Hero: the lesson path ----------
   With no wallet the blocks run a labelled preview. A connected or pasted wallet replaces it with that wallet's
   real progress from the contracts, so a learner never mistakes the preview for their own. */
const heroPath = (() => {
  const row = $('#heroChain'), cap = $('#heroCap');
  if (!row) return null;
  const tiles = $$('.hc', row);
  const PREVIEW = '<span class="hc-tag">Preview</span>Five blocks on BOT Chain Testnet, then one on Mainnet.';
  let shown = -1, timer = 0, source = null;
  const set = (done, animate = true) => {
    tiles.forEach((t, i) => {
      const was = t.classList.contains('done'), now = i < done;
      t.classList.toggle('done', now);
      t.classList.toggle('next', i === done);
      if (animate && now && !was) { t.classList.remove('click'); void t.offsetWidth; t.classList.add('click'); }
    });
    shown = done;
  };
  const step = () => { if (source) return; const n = shown >= 6 ? 0 : shown + 1; set(n); timer = setTimeout(step, n === 6 ? 3200 : n === 0 ? 900 : 1300); };
  const preview = () => { source = null; cap.innerHTML = PREVIEW; row.classList.remove('wait'); set(reduce ? 2 : 0, false); clearTimeout(timer); if (!reduce) timer = setTimeout(step, 1700); };
  // state: 'reading', 'failed' or the number of blocks done (6 once graduated).
  const show = (addr, state, from) => {
    source = from; clearTimeout(timer);
    row.classList.toggle('wait', state === 'reading');
    const who = `<code>${short(addr)}</code>`;
    if (state === 'reading') { set(0, false); tiles[0].classList.remove('next'); cap.innerHTML = `${who}<span class="spin"></span>Reading the chain…`; return; }
    if (state === 'failed') { set(0, false); tiles[0].classList.remove('next'); cap.innerHTML = `${who}Couldn't read this wallet's progress. The testnet RPC may be busy.`; return; }
    set(state);
    cap.innerHTML = `${who}${state === 6 ? 'Passed 5 of 5 and graduated on mainnet.' : state === 5 ? 'Passed 5 of 5. Ready to graduate.' : `Passed ${state} of 5. Lesson ${state + 1} is next.`}`;
  };
  preview();
  let run = 0;
  onWallet(async (w) => {
    if (source === 'checked') return;
    const tok = ++run;
    if (!w.address) { if (source !== null) preview(); return; }
    show(w.address, 'reading', 'wallet');
    try {
      const [done] = await withRetry(() => progressRead().progressOf(w.address));
      let n = Number(done);
      if (n === 5) { try { if (await withRetry(() => graduationRead().isGraduate(w.address))) n = 6; } catch { /* stays at 5 */ } }
      if (tok === run && source === 'wallet') show(w.address, n, 'wallet');
    } catch { if (tok === run && source === 'wallet') show(w.address, 'failed', 'wallet'); }
  });
  return { checked: ({ addr, state }) => { run++; show(addr, state, 'checked'); } };
})();
document.addEventListener('fb:blocks', (e) => heroPath?.checked(e.detail));

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
