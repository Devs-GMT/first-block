// Deploys FirstBlockGraduation to the local node and funds a learner. Only for end-to-end tests, never a real network.
const { ethers } = require('hardhat');
(async () => {
  const learner = process.env.LEARNER;
  const g = await (await ethers.getContractFactory('FirstBlockGraduation')).deploy();
  await g.waitForDeployment();
  if (learner) await ethers.provider.send('hardhat_setBalance', [learner, '0x56BC75E2D63100000']);
  console.log('GRAD', await g.getAddress(), 'chain', (await ethers.provider.getNetwork()).chainId.toString());
})();
