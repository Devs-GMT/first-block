// Deploys FirstBlockProgress to BOT Chain testnet with the Counter code hash from public/counter.json.
// Usage (from contracts/): NODE_OPTIONS=--dns-result-order=ipv4first npx hardhat run scripts/deploy-testnet.js --network botTestnet
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

(async () => {
  const counter = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'counter.json'), 'utf8'));
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  if (net.chainId !== 968n) throw new Error(`Expected testnet (968), got ${net.chainId}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log('deployer', deployer.address, 'balance', ethers.formatEther(bal), 'tBOT');
  if (bal === 0n) throw new Error('Deployer has no tBOT yet.');

  const Progress = await ethers.getContractFactory('FirstBlockProgress');
  const progress = await Progress.deploy(counter.codeHash);
  const receipt = await progress.deploymentTransaction().wait();
  const address = await progress.getAddress();

  // The deployed Counter code must match what the site deploys: check it against a throwaway Counter.
  const Counter = await ethers.getContractFactory('Counter');
  const ref = await Counter.deploy();
  await ref.waitForDeployment();
  const onChain = ethers.keccak256(await ethers.provider.getCode(await ref.getAddress()));
  if (onChain !== counter.codeHash) throw new Error(`Counter code hash mismatch: ${onChain} vs ${counter.codeHash}`);

  const out = { network: 'botTestnet', chainId: 968, progress: address, block: receipt.blockNumber, codeHash: counter.codeHash, deployer: deployer.address };
  fs.mkdirSync(path.join(__dirname, '..', 'deployments'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'deployments', 'testnet.json'), JSON.stringify(out, null, 2));
  console.log('FirstBlockProgress', address, 'block', receipt.blockNumber);
  console.log('Counter code hash on chain matches the export.');
})().catch((e) => { console.error(e.message); process.exit(1); });
