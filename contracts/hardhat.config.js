require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Deployer keys live in contracts/.env (git-ignored): TESTNET_KEY=0x... for the testnet contracts.
// The mainnet Graduation contract is deployed by hand through Remix.
const testnetAccounts = process.env.TESTNET_KEY ? [process.env.TESTNET_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // "paris" avoids PUSH0, so the bytecode runs on chains that have not enabled Shanghai.
      evmVersion: "paris",
      // No metadata hash in the bytecode: the Counter code hash must be identical wherever it is compiled.
      metadata: { bytecodeHash: "none" },
    },
  },
  networks: {
    botTestnet: { url: "https://rpc.bohr.life", chainId: 968, accounts: testnetAccounts },
  },
};
