const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
import { sweepify, io } from './reveal.js';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tick = icon('check', 'sm');

const COPY = [
  { eyebrow: 'Lesson 1 · Get set up', title: 'Your wallet, on BOT Chain, in 2 minutes', body: 'Install MetaMask, add BOT Chain Testnet in one click, and grab free test BOT from the faucet.', do: ['What you\'ll do', 'Add the network and call checkIn(). The contract confirms your wallet has gas.'], learn: ['What you\'ll learn', 'Wallet, address, network and gas, in plain words.'], cap: 'Lesson 1: the network added in one click, test BOT from the faucet, and a check the contract runs itself.' },
  { eyebrow: 'Lesson 2 · First transaction', title: 'Send your first transaction, then read it', body: 'Send 0.001 test BOT to the Progress contract, then open it on the explorer and find your hash, block and gas.', do: ['What you\'ll do', 'Press Send. The contract records your tip if the value is at least 0.001.'], learn: ['What you\'ll learn', 'Transactions, blocks and the explorer, using your own data.'], cap: 'Lesson 2: a real transaction, and a three-question quiz answered from your own hash, block and gas.' },
  { eyebrow: 'Lesson 3 · Talk to a contract', title: 'Say hello and watch it land on the wall', body: 'Call sayHello with your name. Your hello is emitted as an event and shows up on a live wall.', do: ['What you\'ll do', 'Type a name (24 characters at most) and call sayHello.'], learn: ['What you\'ll learn', 'Functions, events, and the difference between reads and writes.'], cap: 'Lesson 3: your hello written to the contract, then read back from its events.' },
  { eyebrow: 'Lesson 4 · Deploy your own contract', title: 'Deploy a Counter that only you own', body: 'Read a short contract line by line, deploy it from your wallet, and submit its address for checking.', do: ['What you\'ll do', 'Deploy Counter, then submit its address to the Progress contract.'], learn: ['What you\'ll learn', 'Deploying, constructors, owners and contract addresses.'], cap: 'Lesson 4: a Counter explained line by line, deployed from your wallet, and checked on chain.' },
  { eyebrow: 'Lesson 5 · Make it do something', title: 'Press increment three times and read it back', body: 'Call increment on your own Counter, read the number for free, and let the contract verify count is at least 3.', do: ['What you\'ll do', 'Press increment() three times, then finish the lesson.'], learn: ['What you\'ll learn', 'State, view functions and gas per call.'], cap: 'Lesson 5: state that changes with every call, and a free view call to read it.' },
  { eyebrow: 'Graduation · Mainnet', title: 'Graduate on BOT Chain mainnet', body: 'After 5 of 5, switch to mainnet in one click and call graduate with an optional note. You\'ll need a little real BOT for gas.', do: ['What you\'ll do', 'Add a note (80 characters at most) and sign one transaction.'], learn: ['What you\'ll get', 'A graduation card to share or download, and a place on the wall.'], cap: 'Graduation: one mainnet transaction, then a card you can share. Example values shown.' },
];

const CODE = [
  ['// SPDX-License-Identifier: MIT', ''],
  ['pragma solidity ^0.8.20;', ''],
  ['contract Counter {', 'A contract is code that lives at an address.'],
  ['  address public owner;', 'owner is readable by anyone.'],
  ['  uint256 public count;', 'count is the state that will change.'],
  ['  constructor() { owner = msg.sender; }', 'Runs once at deploy: you become the owner.'],
  ['  function increment() external {', 'Anyone can call this function.'],
  ['    count += 1;', 'Writing state costs gas.'],
  ['  }', ''],
  ['}', ''],
];

const SCENES = [
  { time: 'Lesson 1 · Get set up', msgs: ['Install MetaMask, add BOT Chain Testnet, and get free test BOT. Then call <code>checkIn</code>.', 'Passed. Your wallet has gas, so you\'re set up.'],
    main: `<p class="m-h">Setup</p>
      <div class="m-card"><div class="m-row"><b>BOT Chain Testnet</b><span class="mono">chain ID 968</span></div><p class="mono dim">rpc.bohr.life</p><div class="m-row"><button class="btn-d" data-b="add">Add network</button><span class="m-ok st" data-k="add">${tick}Added</span></div></div>
      <div class="m-card"><div class="m-row"><b>Test BOT</b><span class="mono" data-k="bal">0.0</span></div><div class="m-row"><button class="btn-s" data-b="faucet">Open faucet</button><span class="m-ok st" data-k="fa">${tick}Received</span></div></div>
      <div class="m-card"><div class="m-row"><code>progress.checkIn()</code><span class="m-state" data-k="st">Waiting</span></div></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      await h.w(1300); await h.press('[data-b=add]'); h.show('[data-k=add]');
      await h.w(700); await h.press('[data-b=faucet]'); h.show('[data-k=fa]'); h.count('[data-k=bal]', 10);
      await h.w(1100); h.state('[data-k=st]', 'Checking the chain…', 'busy');
      await h.w(1400); h.state('[data-k=st]', '✓ Passed', 'ok'); h.msg(1);
    } },
  { time: 'Lesson 2 · First transaction', msgs: ['Send exactly 0.001 test BOT, then find three things on the explorer.', 'Nice. You found all three.'],
    main: `<p class="m-h">Send</p>
      <div class="m-card"><div class="m-row"><code>progress.tip({ value: 0.001 })</code><button class="btn-d" data-b="send">Send</button></div></div>
      <div class="m-card"><p class="m-h">Your transaction</p><div class="kv"><span>hash</span><b class="mono" data-k="hash">pending…</b><span>block</span><b class="mono" data-k="block">pending…</b><span>gas used</span><b class="mono" data-k="gas">pending…</b></div></div>
      <div class="m-card"><p class="m-h">Find it on the explorer</p><div class="q-row" data-q="0"><i></i>Copy your transaction hash</div><div class="q-row" data-q="1"><i></i>Read the block number</div><div class="q-row" data-q="2"><i></i>Read the gas used</div></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      await h.w(1300); await h.press('[data-b=send]');
      await h.w(900); h.set('[data-k=hash]', '0x3f9a…b1c2'); h.set('[data-k=block]', '#1,234,567'); h.set('[data-k=gas]', '21,000');
      for (let i = 0; i < 3; i++) { await h.w(800); h.cls(`[data-q="${i}"]`, 'done'); }
      await h.w(500); h.msg(1);
    } },
  { time: 'Lesson 3 · Talk to a contract', msgs: ['Type your name and I\'ll send it with <code>sayHello</code>.', 'Passed. Your hello is on the wall.'],
    main: `<p class="m-h">Say hello</p>
      <div class="m-card"><div class="m-row"><span class="m-input" data-k="box"><em class="ph" data-k="ph">your name</em><span class="typed" data-k="in"></span><span class="caret"></span></span><button class="btn-d" data-b="hello">Say hello</button></div></div>
      <div class="m-card"><p class="m-h">Hello wall · read from events</p><ul class="wall-list" data-k="list"><li><b>Lin</b><span class="mono">0x7a2c…e1</span></li><li><b>Sam</b><span class="mono">0x19b4…c4</span></li></ul></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      await h.w(1300); await h.move('[data-k=box]', 30, 0); h.cls('[data-k=box]', 'focus'); h.hide('[data-k=ph]');
      await h.type('[data-k=in]', 'Ada', 190);
      await h.w(500); await h.press('[data-b=hello]'); h.cls('[data-k=box]', 'focus', false); h.set('[data-k=in]', '');
      h.prepend('[data-k=list]', '<li class="new"><b>Ada</b><span class="mono">you</span></li>');
      await h.w(900); h.msg(1);
    } },
  { time: 'Lesson 4 · Deploy your own contract', msgs: ['Read Counter line by line, then deploy it from your wallet.', 'Deployed, and the contract confirms you are the owner.'],
    main: `<p class="m-h">Counter.sol</p>
      <div class="m-card code"><div class="code-in">${CODE.map(([l], i) => `<div class="cl" data-l="${i}"><i>${i + 1}</i><code>${l.replace(/</g, '&lt;').replace(/ /g, '&nbsp;')}</code></div>`).join('')}</div><p class="cl-note" data-k="note">Hover a line to see what it does.</p></div>
      <div class="m-card"><div class="m-row"><button class="btn-d" data-b="deploy">Deploy my Counter</button><span class="m-state" data-k="dst"></span></div><p class="mono dim st" data-k="addr">Counter at 0x5d1e…a09c · owner: you</p></div>
      <div class="m-card st" data-k="sub"><div class="m-row"><code>progress.submitCounter(counter)</code><span class="m-state ok">✓ Passed</span></div></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      for (const i of [3, 5, 7]) { await h.w(1100); h.cls('.cl.on', 'on', false); h.cls(`[data-l="${i}"]`, 'on'); h.set('[data-k=note]', CODE[i][1]); }
      await h.w(900); h.cls('.cl.on', 'on', false); await h.press('[data-b=deploy]'); h.state('[data-k=dst]', 'Deploying…', 'busy');
      await h.w(1300); h.state('[data-k=dst]', '✓ Deployed', 'ok'); h.show('[data-k=addr]');
      await h.w(900); h.show('[data-k=sub]'); h.msg(1);
    } },
  { time: 'Lesson 5 · Make it do something', msgs: ['Press increment three times, then read the count back.', 'count is 3. The contract confirms it.'],
    main: `<p class="m-h">Your Counter</p>
      <div class="m-card center"><p class="m-h">count · free view call</p><p class="big" data-k="n">0</p><button class="btn-d" data-b="inc">increment()</button><p class="mono dim">gas per call: about 28,000</p></div>
      <div class="m-card"><div class="m-row"><code>progress.finishCounter()</code><span class="m-state" data-k="st">Waiting</span></div></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      await h.w(1200);
      for (let i = 1; i <= 3; i++) { await h.press('[data-b=inc]'); h.set('[data-k=n]', String(i)); h.cls('[data-k=n]', 'pop'); setTimeout(() => h.cls('[data-k=n]', 'pop', false), 300); await h.w(500); }
      await h.w(500); h.state('[data-k=st]', 'Checking the chain…', 'busy');
      await h.w(1300); h.state('[data-k=st]', '✓ Passed', 'ok'); h.msg(1);
    } },
  { time: 'Graduation · Mainnet', msgs: ['You passed 5 of 5. Switch to mainnet and leave a note.', 'You\'re a graduate. Share your card.'],
    main: `<p class="m-h">Graduate</p>
      <div class="m-card"><div class="m-row"><span class="net" data-k="net">BOT Chain Testnet</span><span class="mono dim">5 / 5 verified on testnet</span></div></div>
      <div class="m-card"><p class="m-h">Note (optional)</p><div class="m-input wide"><span class="typed" data-k="note"></span><span class="caret"></span></div><div class="m-row"><button class="btn-d gold" data-b="grad">Graduate</button><span class="dim sm">Uses a little mainnet gas</span></div></div>
      <div class="m-card grad st" data-k="card"><div class="m-row"><b>${icon('cap')} First Block graduate</b><span class="chip">✓ Verified 5/5</span></div><p class="grad-note" data-k="gn"></p><div class="m-row"><button class="btn-s">Share on X</button><button class="btn-s">Download PNG</button></div></div>`,
    async run(h) {
      await h.w(500); h.msg(0);
      await h.w(1200); await h.press('[data-k=net]'); h.set('[data-k=net]', 'BOT Chain Mainnet'); h.cls('[data-k=net]', 'main');
      await h.w(600); await h.move('[data-k=note]', 60, 0);
      await h.type('[data-k=note]', 'Next I\'m building a poll app!', 55);
      await h.w(500); await h.press('[data-b=grad]');
      h.set('[data-k=gn]', '“Next I\'m building a poll app!”'); h.show('[data-k=card]'); h.confetti();
      await h.w(900); h.msg(1);
    } },
];

export function mountLessons({ app, tabs, left }) {
  const body = $('.app-body', app), rail = $$('.rail-i[data-i]', app), msgsEl = $('.msgs', app), main = $('.main', app), cur = $('.vcursor', app);
  const titleEl = $('.app-bar span', app), cap = $('#lCap');
  const wide = () => matchMedia('(min-width: 961px)').matches;
  let run = 0, active = -1, visible = false;

  left.innerHTML = COPY.map((L, i) => `<div class="l-block" data-i="${i}"><div class="col-text"><p class="eyebrow">${L.eyebrow}</p><h3 data-sweep>${L.title}</h3><p class="muted">${L.body}</p><div class="lrows"><div class="lrow">${icon('send')}<div><b>${L.do[0]}</b><span>${L.do[1]}</span></div></div><div class="lrow">${icon('doc')}<div><b>${L.learn[0]}</b><span>${L.learn[1]}</span></div></div></div></div></div>`).join('');
  const blocks = $$('.l-block', left);
  $$('h3[data-sweep]', left).forEach(sweepify);

  const makeHelpers = (tok) => {
    const w = (ms) => new Promise((res, rej) => setTimeout(() => (tok === run ? res() : rej(new Error('cancel'))), reduce ? 0 : ms));
    const q = (s) => (typeof s === 'string' ? $(s, main) : s);
    const moveTo = (el, dx = 0, dy = 0) => {
      const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
      cur.classList.add('on');
      cur.style.transform = `translate(${r.left - b.left + r.width / 2 + dx}px, ${r.top - b.top + r.height / 2 + dy}px)`;
    };
    return {
      w,
      msg: (n) => $$('.bubble', msgsEl)[n]?.classList.add('show'),
      show: (s) => $$(typeof s === 'string' ? s : '', main).forEach((e) => e.classList.add('show')),
      hide: (s) => q(s)?.classList.add('gone'),
      cls: (s, c, on = true) => $$(s, main).forEach((e) => e.classList.toggle(c, on)),
      set: (s, t) => { const e = q(s); if (e) e.innerHTML = t; },
      state: (s, t, k) => { const e = q(s); if (e) { e.textContent = t; e.className = 'm-state ' + k; } },
      prepend: (s, html) => q(s)?.insertAdjacentHTML('afterbegin', html),
      move: async (s, dx, dy) => { moveTo(q(s), dx, dy); await w(950); },
      press: async (s) => { const e = q(s); moveTo(e, 4, 4); await w(950); e.classList.add('press'); await w(170); e.classList.remove('press'); },
      type: async (s, text, ms) => { const e = q(s); for (const ch of text) { await w(ms); e.textContent += ch; } },
      count: (s, to) => { const e = q(s); let i = 0; const t = setInterval(() => { i++; e.textContent = (to * i / 10).toFixed(1); if (i >= 10) clearInterval(t); }, 70); },
      confetti: () => {
        const cols = ['#1fa971', '#f5b83d', '#1e1d1c'];
        for (let i = 0; i < 18; i++) {
          const s = document.createElement('i'); s.className = 'cf';
          s.style.cssText = `left:${30 + Math.random() * 40}%;background:${cols[i % 3]};--dx:${(Math.random() - .5) * 220}px;--r:${Math.random() * 540}deg;animation-delay:${Math.random() * .15}s`;
          main.append(s); setTimeout(() => s.remove(), 1800);
        }
      },
    };
  };

  const render = (i) => {
    const S = SCENES[i];
    titleEl.textContent = `First Block · ${S.time.split(' · ')[0]}`;
    cap.textContent = COPY[i].cap;
    rail.forEach((r) => r.classList.toggle('on', +r.dataset.i === i));
    $('.chat-time', app).textContent = S.time;
    msgsEl.classList.remove('out');
    msgsEl.innerHTML = S.msgs.map((m) => `<div class="bubble guide st">${m}</div>`).join('');
    main.innerHTML = S.main;
    cur.classList.remove('on');
    const b = body.getBoundingClientRect();
    cur.style.transition = 'none'; cur.style.transform = `translate(${b.width - 160}px, ${b.height - 60}px)`; void cur.offsetWidth; cur.style.transition = '';
  };

  const play = async (i) => {
    const tok = ++run;
    const h = makeHelpers(tok);
    try {
      do {
        render(i);
        await SCENES[i].run(h);
        if (reduce) return;
        await h.w(5200); msgsEl.classList.add('out'); main.classList.add('out');
        await h.w(700); main.classList.remove('out');
      } while (!reduce);
    } catch (_) { /* cancelled */ }
  };

  const setScene = (i) => {
    if (i === active) return;
    active = i;
    tabs.forEach((t, n) => t.setAttribute('aria-selected', n === i));
    blocks.forEach((b, n) => b.classList.toggle('active', n === i));
    if (visible) play(i); else render(i);
  };

  const goTo = (i) => {
    if (wide()) {
      const b = blocks[i].getBoundingClientRect();
      scrollTo({ top: b.top + scrollY + b.height / 2 - innerHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      $('#lessons').scrollIntoView({ behavior: 'smooth' });
      setScene(i);
    }
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => goTo(i)));

  const bio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && wide()) setScene(+e.target.dataset.i); }), { rootMargin: '-46% 0px -46% 0px' });
  blocks.forEach((b) => bio.observe(b));

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) play(active < 0 ? 0 : active); else run++;
  }, { threshold: 0.3 }).observe(app);

  setScene(0);
  return { goTo };
}
