// Single place for deployed addresses. Both contracts are public, so they live in the source and ship with every build.
// VITE_MAINNET_CONTRACT overrides the mainnet address, which lets a test build point at a simulated chain.
export const MAINNET_CONTRACT = import.meta.env.VITE_MAINNET_CONTRACT || '0x52d3764C4300384f73E3E4Cd34bF942A5e60D472';
export const TESTNET_PROGRESS = '0xAC67458c737AB0048193DA66512B8B418E355a7F';
// First block to scan for Hello events; set it to the Progress deployment block.
export const TESTNET_START_BLOCK = 29088619;

export const LINKS = {
  botchain: 'https://botchain.ai',
  docs: 'https://dev-docs.botchain.ai/docs/intro',
  faucet: 'https://faucet.botchain.ai/basic',
  testnetExplorer: 'https://scan.bohr.life',
  mainnetExplorer: 'https://scan.botchain.ai',
  botguide: 'https://bot-guide.space/',
  github: 'https://github.com/Devs-GMT/first-block',
};
