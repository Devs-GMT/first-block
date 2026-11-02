// Creates a testnet-only deployer wallet. The key goes to contracts/.env and is never printed.
const fs = require('fs');
const path = require('path');
const { Wallet } = require('ethers');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath) && /TESTNET_KEY=0x/.test(fs.readFileSync(envPath, 'utf8'))) {
  const w = new Wallet(fs.readFileSync(envPath, 'utf8').match(/TESTNET_KEY=(0x[0-9a-fA-F]+)/)[1]);
  console.log('existing wallet:', w.address);
} else {
  const w = Wallet.createRandom();
  fs.appendFileSync(envPath, `TESTNET_KEY=${w.privateKey}\n`);
  console.log('new wallet:', w.address);
}
