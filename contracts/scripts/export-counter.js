// Writes ../public/counter.json: the ABI, creation bytecode and runtime code hash the site needs for lesson 4.
const fs = require('fs');
const path = require('path');
const { keccak256 } = require('ethers');
const art = require('../artifacts/contracts/Counter.sol/Counter.json');
const out = {
  abi: art.abi,
  bytecode: art.bytecode,
  codeHash: keccak256(art.deployedBytecode),
};
fs.writeFileSync(path.join(__dirname, '..', '..', 'public', 'counter.json'), JSON.stringify(out));
console.log('codeHash', out.codeHash, '· creation bytes', (out.bytecode.length - 2) / 2);
