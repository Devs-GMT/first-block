import { sweepify } from './reveal.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Copy shown beside the preview. The preview itself reuses the real lesson page's markup and classes. */
const COPY = [
  { eyebrow: 'Lesson 1 · Get set up', title: 'Your wallet, on BOT Chain, in 2 minutes', body: 'Install MetaMask, add BOT Chain Testnet in one click, and grab free test BOT from the faucet.', do: ['What you\'ll do', 'Add the network and call checkIn(). The contract confirms your wallet has gas.'], learn: ['What you\'ll learn', 'Wallet, address, network and gas, in plain words.'], cap: 'Lesson 1: the same steps and check you get on the real lesson page. Example values.' },
  { eyebrow: 'Lesson 2 · First transaction', title: 'Send your first transaction, then read it', body: 'Send 0.001 test BOT to the Progress contract, then open it on the explorer and find your hash, block and gas.', do: ['What you\'ll do', 'Press Send. The contract records your tip if the value is at least 0.001.'], learn: ['What you\'ll learn', 'Transactions, blocks and the explorer, using your own data.'], cap: 'Lesson 2: a real transaction, then your own hash, block and gas. Example values.' },
  { eyebrow: 'Lesson 3 · Talk to a contract', title: 'Say hello and watch it land on the wall', body: 'Call sayHello with your name. Your hello is emitted as an event and shows up on a live wall.', do: ['What you\'ll do', 'Type a name (24 characters at most) and call sayHello.'], learn: ['What you\'ll learn', 'Functions, events, and the difference between reads and writes.'], cap: 'Lesson 3: your hello written to the contract, then read back from its events. Example values.' },
  { eyebrow: 'Lesson 4 · Deploy your own contract', title: 'Deploy a Counter that only you own', body: 'Read a short contract line by line, deploy it from your wallet, and submit its address for checking.', do: ['What you\'ll do', 'Deploy Counter, then submit its address to the Progress contract.'], learn: ['What you\'ll learn', 'Deploying, constructors, owners and contract addresses.'], cap: 'Lesson 4: deploy from your wallet, then the contract checks code and owner. Example values.' },
  { eyebrow: 'Lesson 5 · Make it do something', title: 'Press increment three times and read it back', body: 'Call increment on your own Counter, read the number for free, and let the contract verify count is at least 3.', do: ['What you\'ll do', 'Press increment() three times, then finish the lesson.'], learn: ['What you\'ll learn', 'State, view functions and gas per call.'], cap: 'Lesson 5: state that changes with every call, read back by the contract. Example values.' },
  { eyebrow: 'Graduation · Mainnet', title: 'Graduate on BOT Chain mainnet', body: 'After 5 of 5, switch to mainnet in one click and call graduate with an optional note. You\'ll need a little real BOT for gas.', do: ['What you\'ll do', 'Add a note (80 characters at most) and sign one transaction.'], learn: ['What you\'ll get', 'A graduation card to share or download, and a place on the wall.'], cap: 'Graduation: one mainnet transaction, then a card you can share. Example values.' },
];

const btn = (id, label, cls = '') => `<span class="row-a"><button class="pill pill-dark big ${cls}" data-b="${id}" tabindex="-1">${label}</button></span>`;
const txs = (id) => `<p class="txs" data-s="${id}"></p>`;
const li = (title, desc, extra = '') => `<li><b>${title}</b><span class="muted">${desc}</span>${extra}</li>`;
const fakeIn = (k, ph) => `<span class="fake-in" data-k="${k}"><em class="ph">${ph}</em><span class="typed"></span><span class="caret"></span></span>`;

const SCENES = [
  { okText: 'The contract confirmed lesson 1.',
    steps: [li('Add BOT Chain Testnet', 'One click adds the network (chain ID 968).', btn('add', 'Add network')),
      li('Check in', 'The contract will look at your balance. If you have test BOT to pay for gas, you\'re set up.', btn('go', 'Check in') + txs('go'))],
    async run(h) {
      await h.w(900); await h.press('add'); h.label('add', 'Network added'); h.ok(0);
      await h.w(700); await h.press('go'); await h.tx('go', '0x3f9a…b1c2', '1,234,567'); h.ok(1);
      await h.passed();
    } },
  { okText: 'The contract confirmed lesson 2.',
    steps: [li('Send 0.001 test BOT', 'Press Send and confirm in MetaMask. The contract records your tip.', btn('go', 'Send 0.001 test BOT') + txs('go')),
      li('Open it on the explorer', 'Find your three numbers: hash, block and gas.', '<span class="hp-data st" data-k="data"><span class="hp-f"><span>hash</span><b class="mono">0x3f9a…b1c2</b></span><span class="hp-f"><span>block</span><b class="mono">#1,234,567</b></span><span class="hp-f"><span>gas used</span><b class="mono">21,000</b></span></span>')],
    async run(h) {
      await h.w(900); await h.press('go'); await h.tx('go', '0x3f9a…b1c2', '1,234,567'); h.ok(0);
      await h.w(500); h.show('data'); h.ok(1);
      await h.passed();
    } },
  { okText: 'The contract confirmed lesson 3.',
    steps: [li('Type your name and say hello', 'Up to 24 characters. It is written to the chain as an event.', `<span class="row-a">${fakeIn('in', 'Your name or nickname')}<button class="pill pill-dark big" data-b="go" tabindex="-1">Say hello</button></span>` + txs('go')),
      li('Watch it appear', 'The wall below is read from the Hello events on chain.', '<ul class="wall-list" data-k="wall"><li><b>Lin</b><span class="mono">0x7a2c…e1</span></li><li><b>Sam</b><span class="mono">0x19b4…c4</span></li></ul>')],
    async run(h) {
      await h.w(900); await h.move('in', 40); h.focus('in'); await h.type('in', 'Ada', 190);
      await h.w(500); await h.press('go'); h.blur('in'); await h.tx('go', '0x5fea…061c', '1,234,598'); h.ok(0);
      h.prepend('wall', '<li class="new"><b>Ada</b><span class="mono">you</span></li>'); h.ok(1);
      await h.passed();
    } },
  { okText: 'The contract confirmed lesson 4.',
    steps: [li('Deploy your Counter', 'Your wallet creates a new contract. You become its owner.', btn('dep', 'Deploy my Counter') + txs('dep')),
      li('Submit it for checking', 'The Progress contract checks the code and that you are the owner.', btn('sub', 'Submit my Counter') + txs('sub'))],
    async run(h) {
      await h.w(900); await h.press('dep'); await h.tx('dep', '0xcc89…1690', '1,234,640'); h.desc(0, 'Your Counter: <span class="mono">0x5d1e…a09c</span>'); h.ok(0);
      await h.w(700); await h.press('sub'); await h.tx('sub', '0xdf57…c7c9', '1,234,655'); h.ok(1);
      await h.passed();
    } },
  { okText: 'The contract confirmed lesson 5.',
    steps: [li('Press increment() three times', 'Each press is its own transaction. count is <b data-k="cnt">0</b>.', btn('inc', 'increment()') + txs('inc')),
      li('Finish the lesson', 'The contract reads count() from your Counter and wants at least 3.', btn('fin', 'Finish lesson 5') + txs('fin'))],
    async run(h) {
      await h.w(900);
      for (let i = 1; i <= 3; i++) { await h.press('inc'); await h.tx('inc', `0xa1${i}0…77e${i}`, `1,234,${700 + i * 9}`, true); h.count(i); }
      h.ok(0); await h.w(500); await h.press('fin'); await h.tx('fin', '0xe9d2…4b50', '1,234,742'); h.ok(1);
      await h.passed();
    } },
  { okText: 'You graduated on BOT Chain mainnet.',
    steps: [li('Switch to BOT Chain Mainnet', 'Graduation happens on mainnet and uses a little real BOT for gas.', btn('sw', 'Switch to Mainnet')),
      li('Add a note and graduate', '80 characters at most, and it is optional.', `<span class="row-a">${fakeIn('note', 'Your note')}<button class="pill pill-dark big gold" data-b="grad" tabindex="-1">Graduate</button></span>` + txs('grad'))],
    async run(h) {
      await h.w(900); await h.press('sw'); h.label('sw', 'On mainnet'); h.ok(0);
      await h.w(600); await h.move('note', 40); h.focus('note'); await h.type('note', 'Next I\'m building a poll app!', 55);
      await h.w(400); await h.press('grad'); h.blur('note'); await h.tx('grad', '0x84b1…d3a7', '7,812,044'); h.ok(1); h.confetti();
      await h.passed();
    } },
];

export function mountLessons({ app, tabs, left }) {
  const stage = app, steps = $('#stSteps', app), checkEl = $('#stCheck', app), eyebrow = $('#stEyebrow', app), cur = $('#stCursor', app), cap = $('#lCap');
  const wide = () => matchMedia('(min-width: 961px)').matches;
  let run = 0, active = -1, visible = false;

  left.innerHTML = COPY.map((L, i) => `<div class="l-block" data-i="${i}"><div class="col-text"><p class="eyebrow">${L.eyebrow}</p><h3 data-sweep>${L.title}</h3><p class="muted">${L.body}</p><div class="lrows"><div class="lrow">${icon('send')}<div><b>${L.do[0]}</b><span>${L.do[1]}</span></div></div><div class="lrow">${icon('doc')}<div><b>${L.learn[0]}</b><span>${L.learn[1]}</span></div></div></div></div></div>`).join('');
  const blocks = $$('.l-block', left);
  $$('h3[data-sweep]', left).forEach(sweepify);

  const checkHTML = (state, text) => {
    if (state === 'busy') return '<p class="chk busy"><span class="spin"></span>Checking the chain…</p>';
    if (state === 'ok') return `<p class="chk ok">${icon('check')}<span><b>Passed.</b> ${text} <span class="xp-pill">+150 XP</span></span></p>`;
    return '<p class="chk idle">Finish the steps above, then the chain checks you.</p>';
  };

  const helpers = (tok, i) => {
    const w = (ms) => new Promise((res, rej) => setTimeout(() => (tok === run ? res() : rej(new Error('cancel'))), reduce ? 0 : ms));
    const b = (id) => $(`[data-b="${id}"]`, steps);
    const k = (key) => $(`[data-k="${key}"]`, steps);
    const s = (id) => $(`[data-s="${id}"]`, steps);
    const setStat = (id, kind, html) => { const e = s(id); if (e) { e.className = `txs ${kind}`; e.innerHTML = html; } };
    const moveTo = (el, dx = 6, dy = 6) => {
      const c = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      cur.classList.add('on');
      cur.style.transform = `translate(${r.left - c.left + r.width / 2 + dx}px, ${r.top - c.top + r.height / 2 + dy}px)`;
    };
    const h = {
      w,
      label: (id, t) => { b(id).textContent = t; },
      ok: (n) => $$(':scope > li', steps)[n]?.classList.add('ok'),
      desc: (n, html) => { $$(':scope > li', steps)[n].querySelector('.muted').innerHTML = html; },
      show: (key) => k(key)?.classList.add('show'),
      prepend: (key, html) => k(key)?.insertAdjacentHTML('afterbegin', html),
      focus: (key) => { k(key).classList.add('focus'); },
      blur: (key) => { const e = k(key); e.classList.remove('focus'); $('.typed', e).textContent = ''; $('.ph', e).hidden = false; },
      move: async (key, dx) => { moveTo(k(key), dx, 0); await w(950); },
      type: async (key, text, ms) => { const e = k(key); $('.ph', e).hidden = true; for (const ch of text) { await w(ms); $('.typed', e).textContent += ch; } },
      press: async (id) => { const e = b(id); moveTo(e); await w(950); e.classList.add('press'); await w(170); e.classList.remove('press'); },
      count: (n) => { const e = k('cnt'); if (e) e.textContent = String(n); },
      /** Mirrors the real lesson page: confirm in the wallet, wait for the block, confirmed. */
      tx: async (id, hash, block, quick = false) => {
        setStat(id, 'busy', '<span class="spin"></span>Confirm in MetaMask…'); await w(quick ? 500 : 900);
        setStat(id, 'busy', `<span class="spin"></span>Waiting for the block… <span class="link-under mono">${hash}</span>`); await w(quick ? 600 : 1000);
        setStat(id, 'ok', `${icon('check', 'sm')} Confirmed in block #${block}`);
      },
      passed: async () => {
        await w(500); checkEl.innerHTML = checkHTML('busy'); await w(1200);
        checkEl.innerHTML = checkHTML('ok', SCENES[i].okText);
        await w(5200);
      },
      confetti: () => {
        const cols = ['#1fa971', '#f5b83d', '#1e1d1c'];
        for (let n = 0; n < 18; n++) {
          const e = document.createElement('i'); e.className = 'cf';
          e.style.cssText = `left:${30 + Math.random() * 40}%;background:${cols[n % 3]};--dx:${(Math.random() - .5) * 220}px;--r:${Math.random() * 540}deg;animation-delay:${Math.random() * .15}s`;
          stage.append(e); setTimeout(() => e.remove(), 1800);
        }
      },
    };
    return h;
  };

  const render = (i) => {
    eyebrow.textContent = COPY[i].eyebrow;
    cap.textContent = COPY[i].cap;
    steps.innerHTML = SCENES[i].steps.join('');
    checkEl.innerHTML = checkHTML('idle');
    cur.classList.remove('on');
    const c = stage.getBoundingClientRect();
    cur.style.transition = 'none'; cur.style.transform = `translate(${c.width - 90}px, ${c.height - 60}px)`; void cur.offsetWidth; cur.style.transition = '';
  };

  /** Without motion, show the finished state once instead of looping. */
  const renderFinal = (i) => {
    render(i);
    $$(':scope > li', steps).forEach((e) => e.classList.add('ok'));
    $$('.hp-data', steps).forEach((e) => e.classList.add('show'));
    checkEl.innerHTML = checkHTML('ok', SCENES[i].okText);
  };

  const play = async (i) => {
    const tok = ++run;
    if (reduce) return renderFinal(i);
    const h = helpers(tok, i);
    try {
      for (;;) {
        render(i);
        await SCENES[i].run(h);
        stage.classList.add('out'); await h.w(700); stage.classList.remove('out');
      }
    } catch (_) { /* cancelled */ }
  };

  const setScene = (i) => {
    if (i === active) return;
    active = i;
    tabs.forEach((t, n) => t.setAttribute('aria-selected', n === i));
    if (!wide()) tabs[i].scrollIntoView({ inline: 'center', block: 'nearest' });
    blocks.forEach((b, n) => b.classList.toggle('active', n === i));
    if (visible) play(i); else (reduce ? renderFinal(i) : render(i));
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
