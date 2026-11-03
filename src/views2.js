import { Contract } from 'ethers';
import { MAINNET_CONTRACT, LINKS, TESTNET_START_BLOCK } from './config.js';
import { GRADUATION_ABI, NETWORKS, connect, graduationRead, hasWallet, onWallet, progressRead, provider, short, switchTo, wallet, withRetry } from './chain.js';
import { explain, fmtBal, runTx } from './tx.js';
import { esc, icon, link, loadState, toast } from './views.js';

const $ = (s, r = document) => r.querySelector(s);

/* ---------- graduation card (PNG) ---------- */
export function drawCard(canvas, { name, wallet: w, date, id, verified }) {
  const W = 1200, H = 630, c = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  c.fillStyle = '#f7f6f3'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffffff'; roundRect(c, 40, 40, W - 80, H - 80, 36); c.fill();
  c.lineWidth = 4; c.strokeStyle = '#f5b83d'; roundRect(c, 40, 40, W - 80, H - 80, 36); c.stroke();
  // logo mark: three stacked blocks
  c.fillStyle = '#1e1d1c'; roundRect(c, 96, 120, 60, 22, 8); c.fill(); roundRect(c, 96, 96, 44, 18, 7); c.fill();
  c.fillStyle = '#1fa971'; roundRect(c, 96, 72, 28, 18, 7); c.fill();
  c.fillStyle = '#1e1d1c'; c.font = '600 30px Inter, system-ui, sans-serif'; c.fillText('First Block', 176, 124);
  c.fillStyle = '#78756f'; c.font = '500 24px Inter, system-ui, sans-serif'; c.fillText('Graduate', 96, 230);
  c.fillStyle = '#1e1d1c'; c.font = '500 76px Inter, system-ui, sans-serif';
  const nm = name.length > 18 ? name.slice(0, 17) + '…' : name;
  c.fillText(nm, 96, 316);
  c.fillStyle = '#78756f'; c.font = '400 28px "JetBrains Mono", ui-monospace, monospace'; c.fillText(w, 96, 376);
  c.fillStyle = '#1e1d1c'; c.font = '500 30px Inter, system-ui, sans-serif'; c.fillText(`Graduate #${id}  ·  ${date}`, 96, 450);
  c.fillStyle = verified ? '#0f7a50' : '#78756f'; c.font = '500 28px Inter, system-ui, sans-serif';
  c.fillText(verified ? '5/5 ✓ verified on testnet' : '5/5 self-reported', 96, 500);
  c.fillStyle = '#1e1d1c'; c.font = '500 24px Inter, system-ui, sans-serif'; c.textAlign = 'right'; c.fillText('BOT Chain mainnet', W - 96, H - 84); c.textAlign = 'left';
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

async function helloNameOf(addr) {
  const p = progressRead();
  if (!p) return null;
  try { const logs = await withRetry(() => p.queryFilter(p.filters.Hello(addr), TESTNET_START_BLOCK, 'latest')); return logs.length ? logs[logs.length - 1].args.name : null; } catch { return null; }
}

/* ================= /graduate ================= */
export function graduateView(root) {
  let alive = true, st = { addr: null, prog: { count: 0, flags: 0 } }, mine = null, estimate = null, note = '', busy = false, last = null;
  const g = () => graduationRead();

  const load = async () => {
    st = await loadState(wallet.address);
    mine = null;
    if (st.addr && g()) {
      try {
        const id = Number(await withRetry(() => g().gradId(st.addr)));
        if (id) { const e = await withRetry(() => g().grads(id - 1)); mine = { id, note: e.note, at: Number(e[2]) }; }
      } catch { /* leave null */ }
    }
    if (alive) draw();
    // The estimate belongs to this wallet on mainnet, so it runs after every load: arriving there or switching there.
    if (alive && !mine && st.addr && g() && wallet.chainId === NETWORKS.mainnet.id && st.prog.count === 5) { await estimateGas(); if (alive) draw(); }
  };

  const cardHTML = () => `<div class="grad-card-wrap"><canvas id="cardCv" class="card-cv" width="1200" height="630"></canvas>
    <div class="btn-row"><a class="pill pill-dark" id="shareX" target="_blank" rel="noopener" href="#">Share on X</a><button class="pill pill-soft" data-act="png">Download PNG</button></div></div>`;

  const draw = () => {
    if (!alive) return;
    const five = st.prog.count === 5;
    let body;
    if (!MAINNET_CONTRACT) {
      body = `<div class="banner"><span>The mainnet Graduation contract isn't deployed yet, so graduating opens soon. Your progress above is read live from testnet.</span></div>${st.addr ? '<p class="m-h">Preview of your card</p><canvas id="cardCv" class="card-cv" width="1200" height="630"></canvas>' : ''}`;
    } else if (!hasWallet()) {
      body = '<div class="banner"><span>You need MetaMask to graduate.</span><a class="pill pill-dark sm" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a></div>';
    } else if (!st.addr) {
      body = '<div class="banner"><span>Connect the wallet you used for the lessons.</span><button class="pill pill-dark sm" data-act="connect">Connect wallet</button></div>';
    } else if (mine) {
      body = `<p class="done-note">${icon('check', 'sm')}<span>You graduated. <a class="link-under" href="${NETWORKS.mainnet.explorer}/address/${MAINNET_CONTRACT}" target="_blank" rel="noopener">View the contract</a>.</span></p>${cardHTML()}`;
    } else if (!five) {
      body = `<div class="banner"><span>Finish all five lessons first. You're at ${st.prog.count} of 5.</span><a class="pill pill-dark sm" href="/learn">Back to your path</a></div>`;
    } else if (wallet.chainId !== NETWORKS.mainnet.id) {
      body = '<div class="banner"><span>Graduation happens on BOT Chain Mainnet. This step uses a little real BOT for gas.</span><button class="pill pill-dark sm" data-act="switch">Switch to Mainnet</button></div>';
    } else {
      body = `<div class="grad-form"><p class="m-h">Note (optional)</p><input class="v-input wide" id="gradNote" maxlength="80" value="${esc(note)}" placeholder="Next I'm building a poll app!" autocomplete="off" />
        <p class="muted sm">${estimate ? `Estimated gas: about ${estimate}.` : 'The gas estimate shows here.'} You'll need a little real BOT. <a class="link-under" href="${LINKS.botchain}" target="_blank" rel="noopener">Get BOT for gas</a></p>
        <button class="pill pill-dark big" data-act="graduate"${busy ? ' disabled' : ''}>Graduate</button><p class="txs" data-s="g"></p></div>`;
    }
    const typing = document.activeElement?.id === 'gradNote';
    root.innerHTML = `<div class="v-wrap"><p class="eyebrow">Graduation · Mainnet</p><h1 class="v-title">Graduate on BOT Chain mainnet.</h1>
      <p class="muted v-lead">One mainnet transaction records that you finished First Block, with a note if you want to leave one. Mainnet can't read testnet, so the site unlocks this after 5 of 5, and the wall marks you Verified when testnet agrees.</p>
      <div class="g-prog"><span>Lessons passed</span><b>${st.prog.count} / 5</b><div class="pbar"><i style="width:${st.prog.count * 20}%"></i></div></div>
      ${body}</div>`;
    // A late gas estimate redraws the form; keep the caret where the learner was typing.
    if (typing) { const f = $('#gradNote', root); f?.focus(); f?.setSelectionRange(f.value.length, f.value.length); }
    if (mine) paintCard();
    else if (!MAINNET_CONTRACT && st.addr) paintPreview();
  };

  /** Before launch: the learner's own card, marked as a preview (no graduate number yet). */
  const paintPreview = async () => {
    const name = (await helloNameOf(st.addr)) || short(st.addr);
    const cv = $('#cardCv', root);
    if (!cv || !alive) return;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    drawCard(cv, { name, wallet: st.addr, date, id: '—', verified: st.prog.count === 5 });
  };

  const paintCard = async () => {
    const cv = $('#cardCv', root);
    if (!cv) return;
    const name = (await helloNameOf(st.addr)) || short(st.addr);
    const date = new Date(mine.at * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    drawCard(cv, { name, wallet: st.addr, date, id: mine.id, verified: st.prog.count === 5 });
    const text = `I just graduated from First Block on @BOTChain_ai: five lessons, all checked on chain. Graduate #${mine.id}.`;
    $('#shareX', root).href = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.origin)}`;
  };

  const estimateGas = async () => {
    try {
      const prov = provider('mainnet');
      const c = new Contract(MAINNET_CONTRACT, GRADUATION_ABI, prov);
      const gas = await c.graduate.estimateGas('', { from: st.addr });
      const fee = (await prov.getFeeData()).gasPrice;
      estimate = `${Number(gas).toLocaleString('en-US')} gas${fee ? ` (${fmtBal(gas * fee)} BOT)` : ''}`;
    } catch { estimate = null; }
  };

  root.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'connect') connect().catch((er) => toast(explain(er)));
    if (a === 'switch') switchTo('mainnet').catch((er) => toast(explain(er)));
    if (a === 'png') { const cv = $('#cardCv', root); const l = document.createElement('a'); l.download = 'first-block-graduate.png'; l.href = cv.toDataURL('image/png'); l.click(); }
    if (a === 'graduate') {
      note = ($('#gradNote', root)?.value || '').trim();
      busy = true; b.disabled = true;
      const set = (kind, html) => { const el = $('[data-s="g"]', root); if (el) { el.className = `txs ${kind}`; el.innerHTML = html; } };
      try {
        await runTx('mainnet', (s) => new Contract(MAINNET_CONTRACT, GRADUATION_ABI, s).graduate(note), (stage, d) => {
          if (stage === 'wallet') set('busy', '<span class="spin"></span>Confirm in MetaMask…');
          if (stage === 'pending') set('busy', `<span class="spin"></span>Waiting for the block… ${link('mainnet', 'tx', d)}`);
        });
        busy = false; await load(); confetti();
      } catch (er) { busy = false; set('err', esc(explain(er))); b.disabled = false; }
    }
  };
  root.addEventListener('input', (e) => { if (e.target.id === 'gradNote') note = e.target.value; });

  draw();
  load();
  const un = onWallet(() => { if (alive && !busy) load(); });
  return () => { alive = false; un(); root.onclick = null; };
}

function confetti() {
  const cols = ['#1fa971', '#f5b83d', '#1e1d1c'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i'); s.className = 'cf cf-page';
    s.style.cssText = `left:${10 + Math.random() * 80}%;background:${cols[i % 3]};--dx:${(Math.random() - .5) * 320}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * .3}s`;
    document.body.append(s); setTimeout(() => s.remove(), 2200);
  }
}

/* ================= /wall ================= */
export function wallView(root) {
  let alive = true;
  const draw = (html) => { if (alive) root.innerHTML = `<div class="v-wrap"><p class="eyebrow">Graduates</p><h1 class="v-title">The wall.</h1><p class="muted v-lead">Everyone who graduated on BOT Chain mainnet, newest first. <b>Verified</b> means the testnet Progress contract confirms 5 of 5 for that wallet, checked live. Anyone else is <b>Self-reported</b>.</p>${html}</div>`; };
  const g = graduationRead();
  if (!g) { draw('<div class="grad-empty"><p>No graduates yet.</p><p class="muted sm">The mainnet Graduation contract isn\'t deployed yet. The wall fills in as soon as it is.</p></div>'); return () => { alive = false; }; }
  draw('<p class="muted"><span class="spin"></span> Reading the wall…</p>');
  (async () => {
    try {
      const total = Number(await withRetry(() => g.total()));
      if (!total) return draw('<div class="grad-empty"><p>No graduates yet.</p><p class="muted sm">Be the first.</p><a class="pill pill-dark sm" href="/lesson/1">Start lesson 1</a></div>');
      const page = [...(await withRetry(() => g.getGrads(Math.max(0, total - 60), 60)))].reverse();
      const p = progressRead();
      const ids = page.map((_, i) => total - i);
      const verified = await Promise.all(page.map(async (x) => { if (!p) return false; try { return Number((await p.progressOf(x.wallet))[0]) === 5; } catch { return false; } }));
      draw(`<p class="muted sm">${total.toLocaleString('en-US')} graduate${total === 1 ? '' : 's'}</p><div class="wall-grid">${page.map((x, i) => `<article class="grad-card"><div class="m-row"><code>#${ids[i]} · ${short(x.wallet)}</code><span class="chip ${verified[i] ? '' : 'self'}">${verified[i] ? '✓ Verified' : 'Self-reported'}</span></div><q>${x.note ? esc(x.note) : 'No note left.'}</q><span class="muted sm">${new Date(Number(x[2]) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></article>`).join('')}</div>`);
    } catch { draw('<p class="muted">Couldn\'t reach mainnet right now. <button class="link-under" onclick="location.reload()">Retry</button></p>'); }
  })();
  return () => { alive = false; };
}
