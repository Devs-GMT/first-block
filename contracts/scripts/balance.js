const { ethers } = require('hardhat');
(async () => {
  const [d] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const bal = await ethers.provider.getBalance(d.address);
  console.log(d.address, 'chain', net.chainId.toString(), 'balance', ethers.formatEther(bal), 'tBOT');
})();
