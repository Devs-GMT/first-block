require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// The mainnet FirstBlock contract is deployed by hand through Remix, so no deployer key is needed here.

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
    // Local node used to simulate mainnet (HH_CHAIN=677) when end-to-end testing the Graduation flow.
    hardhat: { chainId: Number(process.env.HH_CHAIN || 31337) },
  },
};
