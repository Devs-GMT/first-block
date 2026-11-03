// Single place for deployed addresses. Leave null until deployed; the UI shows an honest "not deployed yet" state.
// VITE_MAINNET_CONTRACT lets a test build point at a simulated chain; production leaves it unset.
export const MAINNET_CONTRACT = import.meta.env.VITE_MAINNET_CONTRACT || null;
export const TESTNET_PROGRESS = '0xB50E42A85d6493A1aA7779CA6eE58b7541EC0952';
// First block to scan for Hello events; set it to the Progress deployment block.
export const TESTNET_START_BLOCK = 29043321;

export const LINKS = {
  botchain: 'https://botchain.ai',
  docs: 'https://dev-docs.botchain.ai/docs/intro',
  faucet: 'https://faucet.botchain.ai/basic',
  testnetExplorer: 'https://scan.bohr.life',
  mainnetExplorer: 'https://scan.botchain.ai',
  botguide: 'https://bot-guide.space/',
  github: 'https://github.com/Devs-GMT/first-block',
};
