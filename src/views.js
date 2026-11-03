import { Contract, ContractFactory, Interface, formatEther, formatUnits, getCreateAddress, parseEther } from 'ethers';
import LESSONS from './lessons.json';
import { MAINNET_CONTRACT, TESTNET_PROGRESS, TESTNET_START_BLOCK, LINKS } from './config.js';
import { COUNTER_ABI, NETWORKS, PROGRESS_ABI, connect, graduationRead, hasWallet, onWallet, progressRead, provider, short, switchTo, wallet, withRetry } from './chain.js';
import { explain, fmtBal, prepare, runTx } from './tx.js';
import { award, startLesson, streakOf, totalXp } from './xp.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
const has = (flags, n) => (flags & (1 << (n - 1))) !== 0;
const link = (which, type, v, text) => `<a class="link-under mono" href="${NETWORKS[which].explorer}/${type}/${v}" target="_blank" rel="noopener">${text ?? short(v)}</a>`;
let counterJson;
const loadCounter = () => (counterJson ??= fetch('/counter.json').then((r) => r.json()));
const counterKey = (a) => `fb-counter-${a.toLowerCase()}`;
const getSavedCounter = (a) => { try { return localStorage.getItem(counterKey(a)); } catch { return null; } };
const saveCounter = (a, c) => { try { localStorage.setItem(counterKey(a), c); } catch { /* ignore */ } };
const ZERO = '0x0000000000000000000000000000000000000000';

/* ---------- shared state loaders ---------- */
async function loadState(addr) {
  const st = { addr, prog: { count: 0, flags: 0 }, bal: null, counter: null, rpcFailed: false };
  if (!addr) return st;
  const p = progressRead();
  try { st.bal = await withRetry(() => provider('testnet').getBalance(addr)); } catch { st.rpcFailed = true; }
  if (p) {
    try { const [c, f] = await withRetry(() => p.progressOf(addr)); st.prog = { count: Number(c), flags: Number(f) }; } catch { st.rpcFailed = true; }
    try { const c = await withRetry(() => p.counterOf(addr)); st.counter = c !== ZERO ? c : null; } catch { /* leave null */ }
  }
  st.savedCounter = getSavedCounter(addr);
  return st;
}

/** First transaction that passed each lesson for this wallet, with block number. */
async function loadTxs(addr) {
  const p = progressRead();
  if (!p || !addr) return {};
  const logs = await withRetry(() => p.queryFilter(p.filters.LessonDone(addr), TESTNET_START_BLOCK, 'latest'));
  const m = {};
  logs.forEach((l) => { const n = Number(l.args.lesson); if (!m[n]) m[n] = { hash: l.transactionHash, block: l.blockNumber }; });
  return m;
}

async function receiptInfo(hash) {
  const r = await withRetry(() => provider('testnet').getTransactionReceipt(hash));
  return r ? { hash, block: r.blockNumber, gas: r.gasUsed.toString(), fee: r.fee } : null;
}

function journeyHTML(st, current) {
  const net = wallet.chainId === NETWORKS.testnet.id ? ['Testnet', 'ok'] : wallet.chainId === NETWORKS.mainnet.id ? ['Mainnet', 'ok'] : wallet.chainId ? [`Wrong network`, 'bad'] : null;
  const all = st.prog.count === 5;
  const segs = [1, 2, 3, 4, 5].map((n) => `<a href="/lesson/${n}" class="jy-seg ${has(st.prog.flags, n) ? 'done' : ''} ${n === current ? 'cur' : ''}" title="Lesson ${n}: ${LESSONS[n - 1].title}" aria-label="Lesson ${n}"></a>`).join('')
    + `<a href="/graduate" class="jy-seg gold ${all ? 'ready' : ''} ${current === 6 ? 'cur' : ''}" title="Graduate on mainnet" aria-label="Graduate"></a>`;
  // A small colour mark made from the address, so each wallet is easy to recognise.
  const hue = (i) => (st.addr ? parseInt(st.addr.slice(2 + i * 6, 8 + i * 6), 16) % 360 : 0);
  const av = st.addr ? `<span class="jy-av" style="background:linear-gradient(135deg,hsl(${hue(0)} 70% 62%),hsl(${hue(1)} 70% 48%))"></span>` : '';
  const stat = (v, k, cls = '') => `<div class="jy-st ${cls}"><b>${v}</b><span>${k}</span></div>`;
  return `<aside class="journey jy ${st.addr ? '' : 'off'}">
    <div class="jy-head">${av}<div class="jy-who">${st.addr ? `<code>${short(st.addr)}</code>${net ? `<span class="jy-net ${net[1]}"><i></i>${net[0]}</span>` : ''}` : '<b>Your journey</b><span class="jy-net">Not connected</span>'}</div></div>
    <div class="jy-prog"><div class="jy-pl"><span>Lessons</span><b>${st.prog.count} of 5</b></div><div class="jy-bar">${segs}</div></div>
    ${st.addr ? `<div class="jy-stats">${stat(st.bal != null ? fmtBal(st.bal) : '…', 'test BOT')}${stat(totalXp(st.addr, st.prog.flags), 'XP', 'xp')}${stat(streakOf(st.addr) || 0, 'day streak')}</div>`
    : '<button class="pill pill-dark sm" data-act="connect">Connect wallet</button>'}</aside>`;
}

/* ================= /learn ================= */
export function learnView(root) {
  let alive = true, st, txs = {}, stats = null;
  const draw = () => {
    if (!alive) return;
    const blocks = [1, 2, 3, 4, 5].map((n) => {
      const done = has(st.prog.flags, n), unlocked = n === 1 || has(st.prog.flags, n - 1);
      const cls = done ? 'done' : unlocked ? 'cur' : 'lock';
      const L = LESSONS[n - 1];
      return `<div class="blk-wrap"><a class="blk ${cls}" href="/lesson/${n}"><span class="blk-n">${done ? icon('check') : n}</span><b>${L.title}</b><span class="blk-s">${done ? 'Passed' : unlocked ? 'Up next' : 'Locked'}</span></a>
        ${done && txs[n] ? link('testnet', 'tx', txs[n].hash, short(txs[n].hash)) : '<span class="mono dim">&nbsp;</span>'}
        <span class="blk-stat muted sm">${stats ? `${stats[n - 1]} wallet${stats[n - 1] === 1 ? '' : 's'} finished` : ''}</span></div>`;
    }).join('<i class="blk-link"></i>');
    const all = st.prog.count === 5;
    root.innerHTML = `<div class="v-wrap"><p class="eyebrow">Your path</p><h1 class="v-title">Five blocks, then graduate.</h1>
      <p class="muted v-lead">Each block ends with a real action on BOT Chain testnet, checked by the chain itself. Finish one to unlock the next.</p>
      ${!st.addr ? `<div class="banner"><span>${hasWallet() ? 'Connect your wallet to see which blocks you have passed.' : 'Install MetaMask to start. Everything here is still readable without it.'}</span>${hasWallet() ? '<button class="pill pill-dark sm" data-act="connect">Connect wallet</button>' : '<a class="pill pill-dark sm" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a>'}</div>` : ''}
      ${!TESTNET_PROGRESS ? '<div class="banner"><span>The Progress contract isn\'t deployed yet, so checks aren\'t live.</span></div>' : ''}
      <div class="chain">${blocks}<i class="blk-link ${all ? 'on' : ''}"></i><div class="blk-wrap"><a class="blk gold ${all ? 'cur' : 'lock'}" href="/graduate"><span class="blk-n">${icon('cap')}</span><b>Graduate</b><span class="blk-s">${all ? 'Ready' : 'After 5 of 5'}</span></a><span class="mono dim">&nbsp;</span><span class="blk-stat muted sm">on BOT Chain mainnet</span></div></div>
      ${st.rpcFailed ? '<p class="muted sm">Couldn\'t reach the testnet RPC. <button class="link-under" data-act="refresh">Retry</button></p>' : ''}</div>`;
  };
  const refresh = async () => {
    st = await loadState(wallet.address);
    draw();
    try { txs = await loadTxs(wallet.address); draw(); } catch { /* hashes are optional */ }
  };
  st = { addr: null, prog: { count: 0, flags: 0 }, bal: null }; draw();
  const un = onWallet(() => { if (alive) refresh(); });
  const p = progressRead();
  if (p) withRetry(() => p.stats()).then((s) => { stats = s.map(Number); draw(); }).catch(() => {});
  root.onclick = (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'connect') connect().catch((er) => toast(explain(er)));
    if (a === 'refresh') refresh();
  };
  return () => { alive = false; un(); root.onclick = null; };
}

/* ================= /lesson/N ================= */
const QUIZ = (tx) => {
  const alt = (s, i) => s.slice(0, -4) + ['a3f1', '07c9', 'e2b8'][i];
  const mk = (q, right, wrongs) => ({ q, opts: [right, ...wrongs].sort((a, b) => (a < b ? -1 : 1)), right });
  const gas = Number(tx.gas);
  return [
    mk('Which one is your transaction hash?', tx.hash.slice(0, 10) + '…' + tx.hash.slice(-4), [alt(tx.hash, 0), alt(tx.hash, 1)].map((h) => h.slice(0, 10) + '…' + h.slice(-4))),
    mk('Which block is your transaction in?', `#${tx.block}`, [`#${tx.block + 7}`, `#${Math.max(1, tx.block - 12)}`]),
    mk('How much gas did it use?', gas.toLocaleString('en-US'), [Math.round(gas * 1.9).toLocaleString('en-US'), Math.round(gas * 0.55).toLocaleString('en-US')]),
  ];
};

const CODE = [
  ['// SPDX-License-Identifier: MIT', 'A license comment. Every contract starts with one.'],
  ['pragma solidity ^0.8.20;', 'Which compiler versions can build this contract.'],
  ['contract Counter {', 'A contract is code that lives at an address on the chain.'],
  ['  address public owner;', 'Stored on the chain. "public" lets anyone read it for free.'],
  ['  uint256 public count;', 'The state that changes. It starts at 0.'],
  ['  event Incremented(address indexed by, uint256 newCount);', 'A public log. Apps read events to know what happened.'],
  ['  constructor() {', 'Runs exactly once, at the moment of deployment.'],
  ['    owner = msg.sender;', 'msg.sender is whoever sent the transaction: you. You become the owner.'],
  ['  }', ''],
  ['  function increment() external {', 'Anyone can call this. Calling it is a transaction and costs gas.'],
  ['    count += 1;', 'Writing to state. This is what the gas pays for.'],
  ['    emit Incremented(msg.sender, count);', 'Writes the event log.'],
  ['  }', ''],
  ['}', ''],
];

const PI = new Interface(PROGRESS_ABI);
const CI = new Interface(COUNTER_ABI);
const tbot = (wei) => {
  const v = Number(formatEther(wei));
  return `${v === 0 ? '0' : v < 0.000001 ? '< 0.000001' : v.toLocaleString('en-US', { maximumSignificantDigits: 3 })} test BOT`;
};
const kv = (k, v, cls = '') => `<div class="kv ${cls}"><dt>${k}</dt><dd>${v}</dd></div>`;
const num = (x) => Number(x).toLocaleString('en-US');

export function lessonView(root, n) {
  const L = LESSONS[n - 1];
  let alive = true, st = { addr: null, prog: { count: 0, flags: 0 }, bal: null }, tx = null, check = { s: 'idle' }, hellos = [], quizDone = {}, timer = 0, stuck = false, busy = false;
  let liveCount = null;
  // Read-only chain data for the Learn cards and the sign previews. Nothing here needs a signature.
  const lv = { price: null, est: {}, nonce: null, block: null, b0: null, read: null, deployPred: null, cj: null };
  let blockTimer = 0;

  const blocker = () => {
    if (!TESTNET_PROGRESS) return { k: 'nocontract' };
    if (!hasWallet()) return { k: 'no-wallet' };
    if (!wallet.address) return { k: 'connect' };
    if (wallet.chainId !== NETWORKS.testnet.id) return { k: 'chain' };
    if (n > 1 && !has(st.prog.flags, n - 1)) return { k: 'locked' };
    if (st.bal === 0n) return { k: 'gas' };
    return null;
  };
  const bannerHTML = () => {
    const b = blocker();
    if (!b) return '';
    const m = {
      nocontract: ['The Progress contract isn\'t deployed yet, so this lesson can\'t be checked.', ''],
      'no-wallet': ['You need MetaMask for this lesson. Everything else on this page is still readable.', '<a class="pill pill-dark sm" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a>'],
      connect: ['Connect your wallet to start.', '<button class="pill pill-dark sm" data-act="connect">Connect wallet</button>'],
      chain: [`You're on ${wallet.chainId === NETWORKS.mainnet.id ? 'BOT Chain Mainnet' : `chain ${wallet.chainId}`}. Switch to BOT Chain Testnet.`, '<button class="pill pill-dark sm" data-act="switch">Switch to Testnet</button>'],
      locked: [`Finish lesson ${n - 1} first.`, `<a class="pill pill-dark sm" href="/lesson/${n - 1}">Go to lesson ${n - 1}</a>`],
      gas: ['Your wallet has no test BOT, so it can\'t pay for gas.', `<a class="pill pill-soft sm" href="${LINKS.faucet}" target="_blank" rel="noopener">Open faucet</a><button class="pill pill-dark sm" data-act="refresh">Check again</button>`],
    }[b.k];
    if (n === 1 && ['chain', 'gas'].includes(b.k)) return '';
    return `<div class="banner" role="status"><span>${m[0]}</span><span class="b-btns">${m[1]}</span></div>`;
  };
  const dis = () => (blocker() || busy ? ' disabled aria-disabled="true"' : '');
  const done = () => has(st.prog.flags, n);
  const stat = (id) => `<p class="txs" data-s="${id}" role="status"></p>`;

  const myCounter = () => st.counter || st.savedCounter;
  const TX = {
    checkin: () => ({ to: TESTNET_PROGRESS, fn: 'checkIn()', data: PI.encodeFunctionData('checkIn') }),
    tip: () => ({ to: TESTNET_PROGRESS, fn: 'tip()', data: PI.encodeFunctionData('tip'), value: parseEther('0.001') }),
    hello: () => ({ to: TESTNET_PROGRESS, fn: 'sayHello(string name)', data: PI.encodeFunctionData('sayHello', ['First Block']) }),
    deploy: () => lv.cj && { to: null, fn: 'constructor()', data: lv.cj.bytecode },
    submit: () => myCounter() && { to: TESTNET_PROGRESS, fn: 'submitCounter(address c)', data: PI.encodeFunctionData('submitCounter', [myCounter()]) },
    inc: () => st.counter && { to: st.counter, fn: 'increment()', data: CI.encodeFunctionData('increment') },
    finish: () => ({ to: TESTNET_PROGRESS, fn: 'finishCounter()', data: PI.encodeFunctionData('finishCounter') }),
  };
  const TX_OF = { 1: ['checkin'], 2: ['tip'], 3: ['hello'], 4: ['deploy', 'submit'], 5: ['inc', 'finish'] }[n];
  const gasText = (k) => {
    if (!st.addr) return 'Connect your wallet to estimate';
    if (!(k in lv.est)) return '…';
    const g = lv.est[k];
    if (g == null) return 'Can\'t estimate yet, it would fail right now';
    return `${num(g)} gas${lv.price ? ` ≈ ${tbot(g * lv.price)}` : ''}`;
  };
  const toName = (a) => (a === TESTNET_PROGRESS ? `Progress ${link('testnet', 'address', a)}` : `Your Counter ${link('testnet', 'address', a)}`);
  const previewInner = (k) => {
    const t = TX[k]();
    if (!t) return '';
    return `<p class="sign-h">${icon('pen', 'xs')}You're about to sign</p><dl>
      ${kv('Contract', t.to ? toName(t.to) : 'None. This creates a new one')}
      ${kv('Function', `<code>${t.fn}</code>`)}
      ${kv('Sends', t.value ? '0.001 test BOT' : 'No BOT, only the gas fee')}
      ${kv('Gas fee', gasText(k))}</dl>`;
  };
  const preview = (k) => `<div class="sign" data-pv="${k}">${previewInner(k)}</div>`;

  const predicted = () => (st.addr && lv.nonce != null ? getCreateAddress({ from: st.addr, nonce: lv.nonce }) : null);
  const W = {
    address: () => `<dl>${kv('Your address', st.addr ? `<code class="brk">${st.addr}</code>` : '<span class="dim">Connect your wallet to see it</span>')}
      ${kv('Address', '<span class="lt ok">Public</span> share it to receive BOT')}
      ${kv('Recovery phrase', '<span class="lt no">Secret</span> never type it into a website')}</dl>`,
    networks: () => `<dl>${['testnet', 'mainnet'].map((w) => kv(NETWORKS[w].name, `<code>chain ID ${NETWORKS[w].id}</code> · ${w === 'testnet' ? 'free test coins, lessons 1 to 5' : 'real BOT, graduation'}${wallet.chainId === NETWORKS[w].id ? ' <span class="lt ok">You are here</span>' : ''}`)).join('')}
      ${wallet.chainId && ![968, 677].includes(wallet.chainId) ? kv('Your wallet', `<span class="lt no">chain ${wallet.chainId}</span> another network`) : ''}</dl>`,
    gasprice: () => `<dl>${kv('Gas price now', lv.price != null ? `<code>${Number(formatUnits(lv.price, 'gwei')).toLocaleString('en-US', { maximumFractionDigits: 3 })} gwei</code>` : '…')}
      ${kv('Check in will use', gasText('checkin'))}
      ${kv('Reading your balance', '0 gas, free')}</dl>`,
    anatomy: () => {
      const t = TX.tip();
      return `<dl>${kv('from', st.addr ? `<code>${short(st.addr)}</code> you` : '<span class="dim">your address</span>')}
        ${kv('to', `<code>${short(t.to)}</code> the Progress contract`)}
        ${kv('value', '<code>0.001</code> test BOT')}
        ${kv('data', `<code>${t.data}</code> = tip()`)}
        ${kv('nonce', lv.nonce != null ? `<code>${lv.nonce}</code> transactions sent before this one` : st.addr ? '…' : '<span class="dim">connect to see yours</span>')}
        ${kv('gas', gasText('tip'))}</dl><p class="lw-note">MetaMask shows these same fields when you confirm.</p>`;
    },
    blocks: () => {
      const rate = lv.b0 && lv.block > lv.b0.n ? (performance.now() - lv.b0.t) / 1000 / (lv.block - lv.b0.n) : null;
      return `<div class="lw-big"><i class="live-dot"></i><code>${lv.block != null ? `#${num(lv.block)}` : '…'}</code><span>latest block</span></div>
        <dl>${kv('New blocks since you opened this page', lv.b0 ? num(lv.block - lv.b0.n) : '…')}
        ${kv('Measured time per block', rate ? `${rate.toFixed(2)} s` : '…')}</dl>`;
    },
    selector: () => `<dl>${['checkIn', 'tip', 'sayHello'].map((f) => { const fr = PI.getFunction(f); return kv(`<code>${fr.format('sighash')}</code>`, `<code>${fr.selector}</code>`); }).join('')}</dl>
      <p class="lw-note">keccak256 of the signature, first 4 bytes. That is all the contract sees.</p>`,
    read: () => {
      const r = lv.read;
      return `<div class="lw-act"><button class="pill pill-soft sm" data-act="read-prog"${st.addr && TESTNET_PROGRESS ? '' : ' disabled'}><code>progressOf(you)</code></button><span class="dim">${st.addr ? 'Press to read. No pop-up will open.' : 'Connect your wallet first.'}</span></div>
        ${r ? `<dl>${r.err ? kv('Result', '<span class="lt no">RPC busy</span> try again') : `${kv('Lessons passed', `<code>${r.done} of 5</code>`)}${kv('Flags', `<code>${r.flags.toString(2).padStart(5, '0')}</code> one bit per lesson, read right to left`)}`}
          ${kv('Took', `${r.ms} ms`)}${kv('Signature', 'none')}${kv('Gas', '0, free')}</dl>` : ''}`;
    },
    events: () => {
      const h = hellos[0];
      return `<dl>${kv('Event', '<code>Hello(address learner, string name)</code>')}
        ${kv('Topic', `<code>${short(PI.getEvent('Hello').topicHash)}</code> its ID in the logs`)}
        ${kv('Latest one', h ? `<b>${esc(h.name)}</b> from <code>${short(h.who)}</code>${h.block ? ` in block ${h.hash ? link('testnet', 'tx', h.hash, `#${num(h.block)}`) : `#${num(h.block)}`}` : ''}` : '<span class="dim">none yet, yours can be the first</span>')}</dl>`;
    },
    bytecode: () => {
      const c = lv.cj;
      return c ? `<dl>${kv('Size', `${num((c.bytecode.length - 2) / 2)} bytes`)}
        ${kv('Starts with', `<code>${c.bytecode.slice(0, 22)}…</code>`)}
        ${kv('Code hash', `<code>${short(c.codeHash)}</code> what the check compares`)}
        ${kv('Sent to', 'nobody, the field is empty')}</dl>` : '<p class="dim">…</p>';
    },
    predict: () => {
      const p = predicted(), d = lv.deployPred, c = st.savedCounter;
      return `<dl>${kv('Your address', st.addr ? `<code>${short(st.addr)}</code>` : '<span class="dim">connect to try</span>')}
        ${kv('Your nonce', lv.nonce != null ? `<code>${lv.nonce}</code>` : '…')}
        ${kv('Next contract address', p ? `<code class="brk">${p}</code>` : '…')}
        ${d && c ? kv('Compared', d.toLowerCase() === c.toLowerCase() ? `<span class="lt ok">Match</span> your Counter landed at <code>${short(c)}</code>, as predicted` : `<span class="lt no">Different</span> another transaction went first, so the nonce moved`) : ''}</dl>`;
    },
    gascompare: () => {
      const g = lv.est.inc;
      return `<div class="bars"><div class="bar-r"><span><code>count()</code> read</span><i style="--w:2%"></i><b>0 gas, free</b></div>
        <div class="bar-r"><span><code>increment()</code> write</span><i class="on" style="--w:100%"></i><b>${st.counter ? gasText('inc') : 'Submit a Counter in lesson 4 first'}</b></div></div>
        ${g ? '<p class="lw-note">Three increments cost three times that.</p>' : ''}`;
    },
  };
  const paint = () => {
    $$('[data-w]', root).forEach((e) => { e.innerHTML = W[e.dataset.w](); });
    $$('[data-pv]', root).forEach((e) => { e.innerHTML = previewInner(e.dataset.pv); });
  };
  const loadLive = async () => {
    const p = provider('testnet'), a = st.addr;
    if (n === 4) { try { lv.cj ??= await loadCounter(); } catch { /* bytecode is optional here */ } }
    const jobs = [withRetry(() => p.getFeeData()).then((f) => { lv.price = f.gasPrice; })];
    if (a) {
      jobs.push(withRetry(() => p.getTransactionCount(a, 'pending')).then((x) => { lv.nonce = x; }));
      TX_OF.forEach((k) => {
        const t = TX[k]();
        if (!t || (k !== 'deploy' && !t.to)) return;
        const req = { from: a, data: t.data, ...(t.to ? { to: t.to } : {}), ...(t.value ? { value: t.value } : {}) };
        jobs.push(p.estimateGas(req).then((g) => { lv.est[k] = g; }, () => { lv.est[k] = null; }));
      });
    }
    await Promise.allSettled(jobs);
    if (alive) paint();
  };
  const tickBlock = async () => {
    try {
      const b = await provider('testnet').getBlockNumber();
      if (!alive) return;
      lv.block = b; lv.b0 ??= { n: b, t: performance.now() };
      const e = $('[data-w="blocks"]', root);
      if (e) e.innerHTML = W.blocks();
    } catch { /* next tick */ }
  };

  const learnHTML = () => `<p class="muted lv-lead">${n === 1 ? 'Three ideas first. ' : ''}The boxes read live from BOT Chain testnet. None of them asks you to sign.</p>
    <div class="learn">${L.learn.map((c, i) => `<article class="lc"><span class="lc-n">${i + 1}</span><div class="lc-b"><h3>${c.t}</h3><p class="muted">${c.b}</p>${c.w ? `<div class="lw" data-w="${c.w}">${W[c.w]()}</div>` : ''}</div></article>`).join('')}</div>`;
  const ideasHTML = () => `<ul class="ideas">${L.ideas.map((t) => `<li>${icon('check', 'sm')}<span>${t}</span></li>`).join('')}</ul>`;

  const stepsHTML = () => {
    const S = [];
    if (n === 1) {
      S.push(`<li class="${hasWallet() ? 'ok' : ''}"><b>Install MetaMask</b><span class="muted">It's the wallet app that holds your address and signs for you. <a class="link-under" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a>. Already have it? Skip ahead.</span></li>`);
      S.push(`<li class="${wallet.chainId === 968 ? 'ok' : ''}"><b>Add BOT Chain Testnet</b><span class="muted">One click adds the network (chain ID 968).</span><span class="row-a"><button class="pill pill-dark sm" data-act="add-net"${hasWallet() ? '' : ' disabled'}>${wallet.chainId === 968 ? 'Network added' : 'Add network'}</button></span>${stat('net')}</li>`);
      S.push(`<li class="${st.bal > 0n ? 'ok' : ''}"><b>Get free test BOT</b><span class="muted">The faucet gives 10 test BOT per address every 24 hours.${st.addr ? ` Your balance: <b>${st.bal != null ? fmtBal(st.bal) : '…'}</b>.` : ''}</span><span class="row-a"><a class="pill pill-soft sm" href="${LINKS.faucet}" target="_blank" rel="noopener">Open faucet</a><button class="pill pill-soft sm" data-act="refresh">Check again</button></span></li>`);
      S.push(`<li class="${done() ? 'ok' : ''}"><b>Check in</b><span class="muted">The contract will look at your balance. If you have test BOT to pay for gas, you're set up.</span>${preview('checkin')}<span class="row-a"><button class="pill pill-dark big" data-act="tx-checkin"${dis()}>${done() ? 'Check in again' : 'Check in'}</button></span>${stat('tx')}</li>`);
    }
    if (n === 2) {
      S.push(`<li class="${tx ? 'ok' : ''}"><b>Send 0.001 test BOT</b><span class="muted">Press Send and confirm in MetaMask. The contract records your tip.</span>${preview('tip')}<span class="row-a"><button class="pill pill-dark big" data-act="tx-tip"${dis()}>${done() ? 'Send again' : 'Send 0.001 test BOT'}</button></span>${stat('tx')}</li>`);
      S.push(`<li class="${tx ? 'ok' : ''}"><b>Open it on the explorer</b><span class="muted">${tx ? `Find your three numbers: hash, block and gas. <a class="link-under" href="${NETWORKS.testnet.explorer}/tx/${tx.hash}" target="_blank" rel="noopener">Open on scan.bohr.life</a>` : 'The link appears after your transaction.'}</span></li>`);
      S.push(`<li class="${Object.keys(quizDone).length === 3 ? 'ok' : ''}"><b>Answer three questions</b>${tx ? `<span class="quiz">${QUIZ(tx).map((q, i) => `<span class="q-block"><span class="q-t">${q.q}</span><span class="q-o">${q.opts.map((o) => `<button class="opt ${quizDone[i] === o ? (o === q.right ? 'right' : 'wrong') : ''}" data-act="quiz" data-q="${i}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</span></span>`).join('')}</span>` : '<span class="muted">Uses your own transaction, so send it first.</span>'}</li>`);
    }
    if (n === 3) {
      S.push(`<li class="${done() ? 'ok' : ''}"><b>Type your name and say hello</b><span class="muted">Up to 24 characters. It is written to the chain as an event.</span>${preview('hello')}<span class="row-a"><input class="v-input" id="helloName" maxlength="24" placeholder="Your name or nickname" autocomplete="off" /><button class="pill pill-dark big" data-act="tx-hello"${dis()}>Say hello</button></span>${stat('tx')}</li>`);
      S.push(`<li><b>Watch it appear</b><span class="muted">The wall below is read from the Hello events on chain.</span><ul class="wall-list">${hellos.length ? hellos.map((h) => `<li class="${st.addr && h.who.toLowerCase() === st.addr.toLowerCase() ? 'new' : ''}"><b>${esc(h.name)}</b><span class="mono">${short(h.who)}</span></li>`).join('') : '<li class="empty"><b>No hellos yet</b><span class="mono">be the first</span></li>'}</ul></li>`);
    }
    if (n === 4) {
      S.push(`<li class="ok"><b>Read the contract</b><span class="muted">Hover or tap a line to see what it does.</span><span class="code-in">${CODE.map(([l], i) => `<span class="cl" data-act="line" data-i="${i}" tabindex="0"><i>${i + 1}</i><code>${esc(l).replace(/ /g, '&nbsp;')}</code></span>`).join('')}</span><span class="cl-note" id="clNote">Hover a line.</span></li>`);
      const c = st.counter || st.savedCounter;
      S.push(`<li class="${c ? 'ok' : ''}"><b>Deploy your Counter</b><span class="muted">Your wallet creates a new contract. You become its owner.${c ? ` Your Counter: ${link('testnet', 'address', c)}` : ''}</span>${preview('deploy')}<span class="row-a"><button class="pill pill-dark big" data-act="deploy"${dis()}>${c ? 'Deploy another' : 'Deploy my Counter'}</button></span>${stat('deploy')}</li>`);
      S.push(`<li class="${done() ? 'ok' : ''}"><b>Submit it for checking</b><span class="muted">The Progress contract checks the code and that you are the owner.</span>${preview('submit')}<span class="row-a"><button class="pill pill-dark big" data-act="submit"${c ? dis() : ' disabled aria-disabled="true"'}>Submit my Counter</button></span>${stat('tx')}</li>`);
    }
    if (n === 5) {
      const c = st.counter;
      S.push(`<li class="${c ? 'ok' : ''}"><b>Your Counter</b><span class="muted">${c ? `${link('testnet', 'address', c)} · count is <b id="cnt">${liveCount ?? '…'}</b> <button class="link-under" data-act="read">Read again</button> <span class="dim">(free, a view call)</span>` : 'Submit a Counter in lesson 4 first.'}</span></li>`);
      S.push(`<li class="${liveCount >= 3 ? 'ok' : ''}"><b>Press increment() three times</b><span class="muted">Each press is its own transaction. Watch the number go up.</span>${preview('inc')}<span class="row-a"><button class="pill pill-dark big" data-act="inc"${c ? dis() : ' disabled aria-disabled="true"'}>increment()</button></span>${stat('inc')}</li>`);
      S.push(`<li class="${done() ? 'ok' : ''}"><b>Finish the lesson</b><span class="muted">The contract reads count() from your Counter and wants at least 3.</span>${preview('finish')}<span class="row-a"><button class="pill pill-dark big" data-act="tx-finish"${dis()}>${done() ? 'Check again' : 'Finish lesson 5'}</button></span>${stat('tx2')}</li>`);
    }
    return S.join('');
  };

  const checkHTML = () => {
    const c = check;
    if (c.s === 'busy') return '<p class="chk busy"><span class="spin"></span>Checking the chain…</p>';
    if (c.s === 'ok' || done()) return `<p class="chk ok">${icon('check')}<span><b>Passed.</b> The contract confirmed lesson ${n}.${c.xp ? ` <span class="xp-pill">+${c.xp} XP</span>` : ''}</span></p>${tx || st.txMeta ? '' : ''}`;
    if (c.s === 'no') return `<p class="chk no"><b>✗ Not yet.</b><span>${c.hint}</span></p><button class="pill pill-soft sm" data-act="check">Try again</button>`;
    if (c.s === 'err') return '<p class="chk no"><b>Couldn\'t reach the chain.</b><span>The testnet RPC is slow right now.</span></p><button class="pill pill-soft sm" data-act="check">Retry</button>';
    return '<p class="chk idle">Finish the steps above, then the chain checks you. You can also press the button.</p><button class="pill pill-soft sm" data-act="check">Check the chain</button>';
  };

  const happenedHTML = () => {
    const t = tx;
    const fn = ['checkIn()', 'tip()', 'sayHello()', 'submitCounter()', 'finishCounter()'][n - 1];
    const node = (ic, k, v, s) => `<div class="fl-n"><span class="fl-ic">${icon(ic)}</span><span class="fl-k">${k}</span><span class="fl-v">${v}</span><span class="fl-s">${s}</span></div>`;
    const dash = '<span class="dim">—</span>';
    return `<div class="happened"><p class="muted">${L.happened}</p>
      <div class="flow ${t ? '' : 'empty'}">
        <div class="fl-row">${node('wallet', 'Your wallet', st.addr ? `<code>${short(st.addr)}</code>` : dash, 'signed it')}<i class="fl-ar" aria-hidden="true"></i>${node('send', 'Transaction', t ? link('testnet', 'tx', t.hash) : dash, `called ${fn}`)}<i class="fl-ar" aria-hidden="true"></i>${node('cube', 'Block', t ? `<code>#${num(t.block)}</code>` : dash, 'final from here')}</div>
        ${t ? `<dl class="fl-foot">${kv('Gas used', `<code>${num(t.gas)}</code>`)}${kv('Fee paid', t.fee != null ? tbot(t.fee) : '…')}</dl>` : '<p class="fl-wait">Your own wallet, transaction and block show up here once you finish this lesson.</p>'}
      </div></div>`;
  };

  const draw = () => {
    if (!alive) return;
    const typed = $('#helloName', root)?.value;
    const next = n < 5 ? `<a class="pill pill-dark" href="/lesson/${n + 1}">Next: lesson ${n + 1}</a>` : '<a class="pill pill-dark" href="/graduate">Next: graduate</a>';
    root.innerHTML = `<div class="v-wrap lv"><div class="lv-main"><a class="back" href="/learn">${icon('chev', 'back-ic')} All lessons</a>
      <p class="eyebrow">Lesson ${n} · ${L.title}</p><h1 class="v-title">${L.headline}</h1>
      ${done() ? `<p class="done-note">${icon('check', 'sm')}<span>You passed this lesson.${tx ? ` <a class="link-under" href="${NETWORKS.testnet.explorer}/tx/${tx.hash}" target="_blank" rel="noopener">View your transaction</a>.` : ''} You can redo it for practice.</span></p>` : ''}
      <section class="lv-sec"><h2>Why it matters</h2><p class="muted">${L.why}</p><p class="tip">${icon('shield', 'sm')}<span>${L.tip}</span></p></section>
      <section class="lv-sec"><h2>Learn</h2>${learnHTML()}</section>
      <section class="lv-sec"><h2>Do it</h2>${bannerHTML()}<ol class="steps-l">${stepsHTML()}</ol></section>
      <section class="lv-sec"><h2>Check</h2><div class="check">${checkHTML()}</div></section>
      <section class="lv-sec"><h2>What just happened?</h2>${happenedHTML()}</section>
      <section class="lv-sec"><h2>Key ideas</h2>${ideasHTML()}</section>
      <div class="lv-foot">${done() ? next : ''}<button class="pill pill-soft" data-act="stuck">Stuck?</button></div>
      ${stuck ? `<div class="stuck"><p><b>Three common fixes</b></p><ol>${L.hints.map((h) => `<li>${h}</li>`).join('')}</ol><a class="link-under" href="${LINKS.botguide}" target="_blank" rel="noopener">Still stuck? Ask BOTGuide</a></div>` : ''}
      </div>${journeyHTML(st, n)}</div>`;
    if (typed) $('#helloName', root).value = typed;
  };

  const setStat = (id, kind, html) => { const e = $(`[data-s="${id}"]`, root); if (e) { e.className = `txs ${kind}`; e.innerHTML = html; } };
  const uiFor = (id) => (stage, data) => {
    if (stage === 'wallet') setStat(id, 'busy', '<span class="spin"></span>Confirm in MetaMask…');
    if (stage === 'pending') setStat(id, 'busy', `<span class="spin"></span>Waiting for the block… ${link('testnet', 'tx', data)}`);
    if (stage === 'done') setStat(id, 'ok', `${icon('check', 'sm')} Confirmed in block #${data.blockNumber}`);
  };

  const refresh = async () => {
    const s = await loadState(wallet.address);
    if (!alive) return;
    st = s;
    if (st.addr && done() && !tx) { try { const m = (await loadTxs(st.addr))[n]; if (m) { tx = await receiptInfo(m.hash); } } catch { /* optional */ } }
    if (n === 5 && st.counter) { try { liveCount = Number(await withRetry(() => new Contract(st.counter, COUNTER_ABI, provider('testnet')).count())); } catch { /* keep */ } }
    if (n === 3) await pullHellos();
    draw();
    loadLive();
  };

  const pullHellos = async () => {
    const p = progressRead();
    if (!p) return;
    try { const logs = await withRetry(() => p.queryFilter(p.filters.Hello(), TESTNET_START_BLOCK, 'latest')); hellos = logs.slice(-6).reverse().map((l) => ({ name: l.args.name, who: l.args.learner, block: l.blockNumber, hash: l.transactionHash })); } catch { /* keep the previous list */ }
  };

  const diagnose = async () => {
    if (n === 1) return st.bal === 0n ? 'Your wallet has no test BOT yet. Get some from the faucet, then press Check in.' : 'Press Check in so the contract can look at your wallet.';
    if (n === 2) return !has(st.prog.flags, 1) ? 'Pass lesson 1 first.' : 'We didn\'t see a tip of at least 0.001 test BOT yet. Press Send.';
    if (n === 3) return 'We haven\'t seen your hello yet. Type a name and press Say hello.';
    if (n === 4) return st.counter ? 'Your Counter is submitted. Press Check the chain again.' : st.savedCounter ? 'You deployed a Counter. Now press Submit my Counter.' : 'Deploy a Counter, then submit it.';
    if (!st.counter) return 'Submit a Counter in lesson 4 first.';
    const c = Number(await withRetry(() => new Contract(st.counter, COUNTER_ABI, provider('testnet')).count()));
    liveCount = c;
    return c < 3 ? `We found your Counter, but count is ${c}. Press increment ${3 - c} more time${3 - c === 1 ? '' : 's'}.` : 'Your count is 3 or more. Press Finish lesson 5.';
  };

  const runCheck = async () => {
    if (!wallet.address) { check = { s: 'no', hint: 'Connect your wallet first, so we know which address to check.' }; return draw(); }
    check = { s: 'busy' }; draw();
    try {
      await refresh();
      if (done()) {
        const xp = award(st.addr, n);
        check = { s: 'ok', xp }; if (xp) toast(`Lesson ${n} passed. +${xp} XP`);
      } else check = { s: 'no', hint: await diagnose() };
    } catch { check = { s: 'err' }; }
    draw();
  };

  const act = async (btn, id, fn, full = true) => {
    busy = true; btn.disabled = true;
    try { await fn(uiFor(id)); } catch (e) { setStat(id, 'err', esc(explain(e))); busy = false; btn.disabled = false; return; }
    busy = false;
    if (full) await runCheck(); else await refresh();
  };

  const actions = {
    connect: () => connect().catch((e) => toast(explain(e))),
    switch: () => switchTo('testnet').catch((e) => toast(explain(e))),
    'add-net': async () => { try { await switchTo('testnet'); } catch (e) { setStat('net', 'err', esc(explain(e))); } },
    refresh: () => refresh(),
    stuck: () => { stuck = !stuck; draw(); },
    check: () => runCheck(),
    read: () => refresh(),
    'read-prog': async () => {
      const t0 = performance.now();
      try { const [d, f] = await withRetry(() => progressRead().progressOf(st.addr)); lv.read = { done: Number(d), flags: Number(f), ms: Math.round(performance.now() - t0) }; } catch { lv.read = { err: true, ms: Math.round(performance.now() - t0) }; }
      paint();
    },
    quiz: (b) => { const q = QUIZ(tx)[+b.dataset.q]; quizDone[+b.dataset.q] = b.dataset.o; if (b.dataset.o !== q.right) { delete quizDone[+b.dataset.q]; b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 900); } else draw(); },
    line: (b) => { const i = +b.dataset.i; $$('.cl', root).forEach((x) => x.classList.toggle('on', x === b)); $('#clNote', root).textContent = CODE[i][1] || 'Just structure.'; },
    'tx-checkin': (b) => act(b, 'tx', (ui) => runTx('testnet', (s) => new Contract(TESTNET_PROGRESS, PROGRESS_ABI, s).checkIn(), ui).then(afterTx)),
    'tx-tip': (b) => act(b, 'tx', (ui) => runTx('testnet', (s) => new Contract(TESTNET_PROGRESS, PROGRESS_ABI, s).tip({ value: parseEther('0.001') }), ui).then(afterTx)),
    'tx-hello': (b) => { const name = $('#helloName', root).value.trim(); if (!name || name.length > 24) return setStat('tx', 'err', 'Type a name between 1 and 24 characters.'); return act(b, 'tx', (ui) => runTx('testnet', (s) => new Contract(TESTNET_PROGRESS, PROGRESS_ABI, s).sayHello(name), ui).then(afterTx)); },
    deploy: (b) => act(b, 'deploy', async (ui) => {
      lv.deployPred = predicted();
      const cj = await loadCounter();
      const r = await runTx('testnet', async (s) => { const f = new ContractFactory(cj.abi, cj.bytecode, s); const d = await f.deploy(); return d.deploymentTransaction(); }, ui);
      saveCounter(wallet.address, r.contractAddress);
    }, false),
    submit: (b) => act(b, 'tx', (ui) => runTx('testnet', (s) => new Contract(TESTNET_PROGRESS, PROGRESS_ABI, s).submitCounter(st.counter || st.savedCounter), ui).then(afterTx)),
    inc: (b) => act(b, 'inc', async (ui) => { await runTx('testnet', (s) => new Contract(st.counter, COUNTER_ABI, s).increment(), ui); await refresh(); }, false),
    'tx-finish': (b) => act(b, 'tx2', (ui) => runTx('testnet', (s) => new Contract(TESTNET_PROGRESS, PROGRESS_ABI, s).finishCounter(), ui).then(afterTx)),
  };
  const afterTx = async (receipt) => { tx = { hash: receipt.hash, block: receipt.blockNumber, gas: receipt.gasUsed.toString(), fee: receipt.fee }; };

  root.onclick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    actions[el.dataset.act]?.(el);
  };
  root.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'helloName') $('[data-act="tx-hello"]', root)?.click(); };

  draw();
  const un = onWallet(() => { if (alive) { startLesson(wallet.address, n); check = { s: 'idle' }; refresh(); } });
  startLesson(wallet.address, n);
  loadLive();
  if (n === 2) { tickBlock(); blockTimer = setInterval(tickBlock, 2000); }
  if (n === 3) timer = setInterval(async () => { if (!busy) { await pullHellos(); if (alive && !$('#helloName', root)?.matches(':focus')) draw(); } }, 8000);
  return () => { alive = false; un(); clearInterval(timer); clearInterval(blockTimer); root.onclick = null; root.onkeydown = null; };
}

/* ---------- toast (shared with live.js) ---------- */
function toast(html) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 5000);
}
export { toast, has, link, esc, icon, loadState, loadTxs };
