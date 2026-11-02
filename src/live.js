import { MAINNET_CONTRACT, TESTNET_PROGRESS, TESTNET_START_BLOCK, LINKS } from './config.js';
import { NETWORKS, connect, disconnect, hasWallet, isAddress, onWallet, progressRead, graduationRead, scanWallet, short, switchTo, wallet, withRetry } from './chain.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Toast ---------- */
let toastTimer = 0;
export function toast(html) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 6000);
}

/* ---------- Wallet button + menu ---------- */
export function initWalletUI() {
  const dd = $('#walletDd'), btn = $('#connect'), label = $('#connectLabel'), menu = $('#walletMenu'), sheetBtn = $('#connectM');
  if (!dd) return;
  const netOf = (id) => (id === NETWORKS.testnet.id ? NETWORKS.testnet.name : id === NETWORKS.mainnet.id ? NETWORKS.mainnet.name : null);
  const needInstall = () => toast('MetaMask wasn\'t found. <a href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a>, then reload this page.');

  const draw = (w) => {
    const on = !!w.address;
    dd.classList.toggle('connected', on);
    label.textContent = on ? short(w.address) : 'Connect wallet';
    if (sheetBtn) sheetBtn.textContent = on ? `Wallet · ${short(w.address)}` : 'Connect wallet';
    if (!on) { menu.innerHTML = ''; dd.classList.remove('open'); return; }
    const net = netOf(w.chainId);
    menu.innerHTML = `<p class="wm-addr mono">${esc(w.address)}</p><p class="wm-net ${net ? 'ok' : 'bad'}">${net ? esc(net) : `Unsupported network (chain ${w.chainId})`}</p>
      ${w.chainId !== NETWORKS.testnet.id ? '<button role="menuitem" data-a="testnet">Switch to Testnet</button>' : ''}
      ${w.chainId !== NETWORKS.mainnet.id ? '<button role="menuitem" data-a="mainnet">Switch to Mainnet</button>' : ''}
      <button role="menuitem" data-a="copy">Copy address</button><button role="menuitem" data-a="out">Disconnect</button>`;
  };
  onWallet(draw);

  const click = async () => {
    if (!hasWallet()) return needInstall();
    if (wallet.address) { dd.classList.toggle('open'); return; }
    try { await connect(); } catch (e) { if (e.message === 'no-wallet') needInstall(); else toast(e?.code === 4001 ? 'Connection cancelled.' : 'Couldn\'t connect. Check MetaMask and try again.'); }
  };
  btn.addEventListener('click', click);
  sheetBtn?.addEventListener('click', click);
  menu.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'out') disconnect();
    else if (a === 'copy') { try { await navigator.clipboard.writeText(wallet.address); toast('Address copied.'); } catch { toast('Couldn\'t copy.'); } }
    else { try { await switchTo(a); } catch (er) { toast(er?.code === 4001 ? 'Network switch cancelled.' : 'Couldn\'t switch network.'); } }
    dd.classList.remove('open');
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#walletDd')) dd.classList.remove('open'); });
}

/* ---------- Hero: check any wallet against the chain ---------- */
const BLOCK_IC = ['done', 'cur'];
export function initScan() {
  const form = $('#walletForm'), input = $('#walletInput'), note = $('#walletResult'), panel = $('#scan');
  if (!form) return;
  input.addEventListener('input', () => form.classList.toggle('filled', input.value.length > 0));
  let run = 0;

  const rowHTML = (key, label) => `<li data-k="${key}" class="pending"><span class="s-ic"><span class="spin"></span></span><span class="s-l">${label}</span><span class="s-v"></span></li>`;
  const setRow = (key, state, value) => {
    const li = $(`[data-k="${key}"]`, panel);
    if (!li) return;
    li.className = state;
    $('.s-ic', li).innerHTML = state === 'ok' ? icon('check', 'sm') : state === 'na' ? '–' : state === 'err' ? '!' : '<span class="spin"></span>';
    $('.s-v', li).textContent = value ?? '';
  };
  const drawBlocks = (done) => {
    $('.s-blocks', panel).innerHTML = [1, 2, 3, 4, 5].map((n) => `<i class="${done != null && n <= done ? 'done' : ''}"></i>`).join('') + '<i class="gold"></i>';
  };

  const check = async (addr) => {
    const tok = ++run;
    note.className = 'search-note'; note.textContent = '';
    panel.hidden = false;
    panel.innerHTML = `<div class="s-head"><b class="mono">${short(addr)}</b><span class="chip">BOT Chain Testnet</span></div>
      <ul class="s-list">${rowHTML('found', 'Wallet address')}${rowHTML('balance', 'Test BOT balance')}${rowHTML('txs', 'Transactions sent')}${rowHTML('done', 'Lessons passed')}${rowHTML('graduate', 'Graduated on mainnet')}</ul>
      <div class="s-blocks"></div><div class="s-foot"></div>`;
    drawBlocks(null);
    setRow('found', 'ok', 'Valid');
    let failed = false;
    const res = await scanWallet(addr, (key, val) => {
      if (tok !== run) return;
      if (val === undefined) { failed = true; return setRow(key, 'err', 'Couldn\'t read'); }
      if (key === 'balance') setRow(key, 'ok', `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 })} tBOT`);
      if (key === 'txs') setRow(key, 'ok', String(val));
      if (key === 'done') { if (val === null) setRow(key, 'na', 'Contract not live yet'); else { setRow(key, 'ok', `${val.count} of 5`); drawBlocks(val.count); } }
      if (key === 'graduate') { if (val === null) setRow(key, 'na', 'Contract not live yet'); else setRow(key, 'ok', val ? 'Yes' : 'Not yet'); }
    });
    if (tok !== run) return;
    const foot = $('.s-foot', panel);
    if (failed) foot.innerHTML = '<button class="link-under" data-retry>Retry the failed reads</button>';
    else if (res.done && res.done.count === 5) foot.textContent = 'All five lessons passed. This wallet can graduate on mainnet.';
    else if (!res.done) foot.textContent = 'Lesson progress is read from the Progress contract, which isn\'t deployed yet.';
    else foot.innerHTML = `<a class="link-under" href="#lessons">Continue with lesson ${Math.min(res.done.count + 1, 5)}</a>`;
    $('[data-retry]', panel)?.addEventListener('click', () => check(addr));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim() || wallet.address || '';
    note.className = 'search-note';
    if (!v) { note.classList.add('err'); note.textContent = 'Paste a wallet address, or connect your wallet first.'; return; }
    if (!isAddress(v)) { note.classList.add('err'); note.textContent = 'That doesn\'t look like a wallet address. It starts with 0x and has 40 more characters.'; return; }
    check(v);
  });
}

/* ---------- Hello wall ---------- */
export async function initWall() {
  const list = $('#demoList');
  const p = progressRead();
  if (!list || !p) return false;
  $('#wallState').textContent = 'Live';
  $('#wallFoot').textContent = 'Read straight from the Hello events of the Progress contract on BOT Chain testnet.';
  const draw = (items) => {
    list.innerHTML = items.length
      ? items.map((h) => `<li><b>${esc(h.name)}</b><span class="mono">${short(h.who)}</span></li>`).join('')
      : '<li class="empty"><b>No hellos yet</b><span class="mono">be the first</span></li>';
  };
  const pull = async () => {
    const logs = await withRetry(() => p.queryFilter(p.filters.Hello(), TESTNET_START_BLOCK || 0, 'latest'));
    draw(logs.slice(-4).reverse().map((l) => ({ name: l.args.name, who: l.args.learner })));
  };
  try { await pull(); } catch { $('#wallFoot').textContent = 'Couldn\'t reach the testnet RPC. Retrying…'; }
  setInterval(() => pull().catch(() => {}), 10000);
  return true;
}

/* ---------- Graduates ---------- */
export async function initGraduates() {
  const g = graduationRead();
  if (!g) return;
  const holder = $('#grads');
  const render = async () => {
    const total = Number(await withRetry(() => g.total()));
    $('#gradPill').textContent = `${total} graduate${total === 1 ? '' : 's'}`;
    if (!total) return;
    $('#gradTitle').textContent = `${total.toLocaleString()} builder${total === 1 ? '' : 's'} already took their first block.`;
    const page = await withRetry(() => g.getGrads(Math.max(0, total - 12), 12));
    const p = progressRead();
    const cards = await Promise.all([...page].reverse().map(async (x, i) => {
      let verified = false;
      if (p) { try { verified = Number((await p.progressOf(x.wallet))[0]) === 5; } catch { /* leave Self-reported */ } }
      const date = new Date(Number(x.at) * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      return `<article class="grad-card"><div class="m-row"><code>${short(x.wallet)}</code><span class="chip ${verified ? '' : 'self'}">${verified ? '✓ Verified' : 'Self-reported'}</span></div><q>${x.note ? esc(x.note) : 'No note left.'}</q><span class="muted sm">${date}</span></article>`;
    }));
    holder.className = 'grads grad-row';
    holder.innerHTML = cards.join('');
  };
  try { await render(); } catch { /* keep the honest empty state */ }
}
