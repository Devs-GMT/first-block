const { expect } = require('chai');
const { ethers } = require('hardhat');

const TIP = ethers.parseEther('0.001');

async function setup() {
  const [owner, ada, bob] = await ethers.getSigners();
  const Counter = await ethers.getContractFactory('Counter');
  const ref = await Counter.deploy();
  const hash = ethers.keccak256(await ethers.provider.getCode(await ref.getAddress()));
  const FirstBlock = await ethers.getContractFactory('FirstBlock');
  const progress = await FirstBlock.deploy(hash);
  return { owner, ada, bob, Counter, progress, hash };
}

/** Walks a learner through lessons 1 to `upTo` the way the site does. */
async function walk(ctx, who, upTo) {
  const p = ctx.progress.connect(who);
  if (upTo >= 1) await p.checkIn();
  if (upTo >= 2) await p.tip({ value: TIP });
  if (upTo >= 3) await p.sayHello('Ada');
  let counter;
  if (upTo >= 4) {
    counter = await ctx.Counter.connect(who).deploy();
    await p.submitCounter(await counter.getAddress());
  }
  if (upTo >= 5) {
    for (let i = 0; i < 3; i++) await counter.increment();
    await p.finishCounter();
  }
  return counter;
}

describe('Counter', () => {
  it('records its deployer as owner and counts up', async () => {
    const { ada, Counter } = await setup();
    const c = await Counter.connect(ada).deploy();
    expect(await c.owner()).to.equal(ada.address);
    await expect(c.increment()).to.emit(c, 'Incremented').withArgs(ada.address, 1);
    expect(await c.count()).to.equal(1n);
  });

  it('has the same runtime code every time it is deployed', async () => {
    const { ada, bob, Counter } = await setup();
    const a = await Counter.connect(ada).deploy();
    const b = await Counter.connect(bob).deploy();
    const ha = ethers.keccak256(await ethers.provider.getCode(await a.getAddress()));
    const hb = ethers.keccak256(await ethers.provider.getCode(await b.getAddress()));
    expect(ha).to.equal(hb);
  });
});

describe('FirstBlock lessons', () => {
  it('passes lesson 1 when the wallet has gas', async () => {
    const ctx = await setup();
    await expect(ctx.progress.connect(ctx.ada).checkIn()).to.emit(ctx.progress, 'LessonDone').withArgs(ctx.ada.address, 1);
    const [done, flags] = await ctx.progress.progressOf(ctx.ada.address);
    expect(done).to.equal(1n);
    expect(flags).to.equal(1n);
  });

  it('locks every lesson until the previous one is passed', async () => {
    const { progress, ada } = await setup();
    const p = progress.connect(ada);
    await expect(p.tip({ value: TIP })).to.be.revertedWithCustomError(progress, 'NotDone').withArgs(1);
    await expect(p.sayHello('Ada')).to.be.revertedWithCustomError(progress, 'NotDone').withArgs(2);
    await expect(p.submitCounter(ada.address)).to.be.revertedWithCustomError(progress, 'NotDone').withArgs(3);
    await expect(p.finishCounter()).to.be.revertedWithCustomError(progress, 'NotDone').withArgs(4);
  });

  it('needs at least 0.001 BOT for lesson 2', async () => {
    const ctx = await setup();
    const p = ctx.progress.connect(ctx.ada);
    await p.checkIn();
    await expect(p.tip({ value: TIP - 1n })).to.be.revertedWithCustomError(ctx.progress, 'TipTooSmall');
    await expect(p.tip({ value: TIP })).to.emit(ctx.progress, 'LessonDone').withArgs(ctx.ada.address, 2);
    expect(await ethers.provider.getBalance(await ctx.progress.getAddress())).to.equal(TIP);
  });

  it('emits Hello and rejects empty or long names', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 2);
    const p = ctx.progress.connect(ctx.ada);
    await expect(p.sayHello('')).to.be.revertedWithCustomError(ctx.progress, 'BadName');
    await expect(p.sayHello('x'.repeat(25))).to.be.revertedWithCustomError(ctx.progress, 'BadName');
    await expect(p.sayHello('x'.repeat(24))).to.emit(ctx.progress, 'Hello').withArgs(ctx.ada.address, 'x'.repeat(24));
  });

  it('accepts only a real Counter that the sender owns', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 3);
    const p = ctx.progress.connect(ctx.ada);
    await expect(p.submitCounter(ctx.bob.address)).to.be.revertedWithCustomError(ctx.progress, 'NotACounter');
    const other = await ctx.Counter.connect(ctx.bob).deploy();
    await expect(p.submitCounter(await other.getAddress())).to.be.revertedWithCustomError(ctx.progress, 'NotYourCounter');
    await expect(p.submitCounter(await ctx.progress.getAddress())).to.be.revertedWithCustomError(ctx.progress, 'NotACounter');
    const mine = await ctx.Counter.connect(ctx.ada).deploy();
    await expect(p.submitCounter(await mine.getAddress())).to.emit(ctx.progress, 'LessonDone').withArgs(ctx.ada.address, 4);
    expect(await ctx.progress.counterOf(ctx.ada.address)).to.equal(await mine.getAddress());
  });

  it('wants the Counter incremented three times for lesson 5', async () => {
    const ctx = await setup();
    const counter = await walk(ctx, ctx.ada, 4);
    const p = ctx.progress.connect(ctx.ada);
    await counter.increment();
    await counter.increment();
    await expect(p.finishCounter()).to.be.revertedWithCustomError(ctx.progress, 'CountTooLow').withArgs(2);
    await counter.increment();
    await expect(p.finishCounter()).to.emit(ctx.progress, 'LessonDone').withArgs(ctx.ada.address, 5);
    const [done] = await ctx.progress.progressOf(ctx.ada.address);
    expect(done).to.equal(5n);
  });

  it('counts each wallet once per lesson and keeps wallets apart', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 5);
    await walk(ctx, ctx.bob, 2);
    await ctx.progress.connect(ctx.ada).checkIn(); // redoing a lesson changes nothing
    const s = await ctx.progress.stats();
    expect(s.map(Number)).to.deep.equal([2, 2, 1, 1, 1]);
    const [bobDone] = await ctx.progress.progressOf(ctx.bob.address);
    expect(bobDone).to.equal(2n);
  });

  it('lets only the owner sweep the tips', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 2);
    await expect(ctx.progress.connect(ctx.ada).sweep(ctx.ada.address)).to.be.revertedWithCustomError(ctx.progress, 'NotOwner');
    await expect(ctx.progress.connect(ctx.owner).sweep(ctx.bob.address)).to.changeEtherBalance(ctx.bob, TIP);
  });
});

describe('FirstBlock graduation', () => {
  it('only lets a wallet graduate after passing all five lessons', async () => {
    const ctx = await setup();
    const g = ctx.progress.connect(ctx.ada);
    await expect(g.graduate('too early')).to.be.revertedWithCustomError(ctx.progress, 'NotFinished').withArgs(0);
    await walk(ctx, ctx.ada, 3);
    await expect(g.graduate('still early')).to.be.revertedWithCustomError(ctx.progress, 'NotFinished').withArgs(3);
    expect(await ctx.progress.total()).to.equal(0n);
  });

  it('records a graduate once per wallet', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 5);
    const g = ctx.progress.connect(ctx.ada);
    await expect(g.graduate("Next I'm building a poll app!")).to.emit(ctx.progress, 'Graduated').withArgs(1, ctx.ada.address);
    expect(await ctx.progress.total()).to.equal(1n);
    expect(await ctx.progress.isGraduate(ctx.ada.address)).to.equal(true);
    await expect(g.graduate('again')).to.be.revertedWithCustomError(ctx.progress, 'AlreadyGraduated');
  });

  it('caps the note at 80 bytes and allows an empty note', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 5);
    await walk(ctx, ctx.bob, 5);
    await expect(ctx.progress.connect(ctx.ada).graduate('x'.repeat(81))).to.be.revertedWithCustomError(ctx.progress, 'NoteTooLong');
    await ctx.progress.connect(ctx.ada).graduate('x'.repeat(80));
    await ctx.progress.connect(ctx.bob).graduate('');
    expect(await ctx.progress.total()).to.equal(2n);
  });

  it('pages through graduates oldest first', async () => {
    const ctx = await setup();
    await walk(ctx, ctx.ada, 5);
    await walk(ctx, ctx.bob, 5);
    await ctx.progress.connect(ctx.ada).graduate('one');
    await ctx.progress.connect(ctx.bob).graduate('two');
    const page = await ctx.progress.getGrads(0, 10);
    expect(page.map((x) => x.note)).to.deep.equal(['one', 'two']);
    expect((await ctx.progress.getGrads(1, 1)).map((x) => x.wallet)).to.deep.equal([ctx.bob.address]);
    expect(await ctx.progress.getGrads(5, 3)).to.have.length(0);
    expect(await ctx.progress.isGraduate(ethers.ZeroAddress)).to.equal(false);
  });
});
