// Deploys the FirstBlock contract to the local node (chain 677) and funds a learner.
// Only for end-to-end tests, never a real network.
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');
(async () => {
  const learner = process.env.LEARNER;
  const counter = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'counter.json'), 'utf8'));
  const c = await (await ethers.getContractFactory('FirstBlock')).deploy(counter.codeHash);
  const r = await c.deploymentTransaction().wait();
  if (learner) await ethers.provider.send('hardhat_setBalance', [learner, '0x56BC75E2D63100000']);
  console.log('FIRSTBLOCK', await c.getAddress(), 'block', r.blockNumber, 'chain', (await ethers.provider.getNetwork()).chainId.toString());
})();
