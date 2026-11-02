// End-to-end check on the real testnet: verifies the deployed bytecode, then walks a second wallet through all five lessons.
// Usage (from contracts/): NODE_OPTIONS=--dns-result-order=ipv4first npx hardhat run scripts/e2e-testnet.js --network botTestnet
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

(async () => {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments', 'testnet.json'), 'utf8'));
  const [deployer] = await ethers.getSigners();
  const art = require('../artifacts/contracts/FirstBlockProgress.sol/FirstBlockProgress.json');

  // 1. Deployed code must equal what we compiled (the constructor argument is immutable, so patch-compare by length + prefix).
  const onChain = await ethers.provider.getCode(dep.progress);
  const built = art.deployedBytecode;
  console.log('deployed code bytes', (onChain.length - 2) / 2, '· built', (built.length - 2) / 2, onChain.length === built.length ? '(same length)' : '(DIFFERENT)');
  let diff = 0;
  for (let i = 0; i < built.length; i++) if (built[i] !== onChain[i]) diff++;
  console.log('differing hex chars (immutables only expected):', diff);

  // 2. Full path with a throwaway learner funded by the deployer.
  const learner = ethers.Wallet.createRandom().connect(ethers.provider);
  await (await deployer.sendTransaction({ to: learner.address, value: ethers.parseEther('0.5') })).wait();
  const progress = new ethers.Contract(dep.progress, art.abi, learner);
  const counterArt = require('../artifacts/contracts/Counter.sol/Counter.json');
  const step = async (label, p) => { const r = await (await p).wait(); console.log(label, 'ok · block', r.blockNumber, 'gas', r.gasUsed.toString()); };

  await step('1 checkIn', progress.checkIn());
  await step('2 tip', progress.tip({ value: ethers.parseEther('0.001') }));
  await step('3 sayHello', progress.sayHello('e2e-test'));
  const factory = new ethers.ContractFactory(counterArt.abi, counterArt.bytecode, learner);
  const counter = await factory.deploy();
  await counter.waitForDeployment();
  await step('4 submitCounter', progress.submitCounter(await counter.getAddress()));
  for (let i = 0; i < 3; i++) await (await counter.increment()).wait();
  await step('5 finishCounter', progress.finishCounter());

  const [done, flags] = await progress.progressOf(learner.address);
  console.log('progressOf', done.toString(), 'flags', flags.toString(), '· stats', (await progress.stats()).map(String).join(','));
  if (done !== 5n) throw new Error('Learner did not reach 5/5');
  console.log('E2E passed on testnet for', learner.address);
})().catch((e) => { console.error(e.message); process.exit(1); });
