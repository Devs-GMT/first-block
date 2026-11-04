// Single place for the deployed address. One contract, FirstBlock, runs the five lessons and graduation on BOT Chain
// mainnet. The address is public, so it ships with every build. VITE_PROGRESS_CONTRACT and VITE_PROGRESS_START_BLOCK
// override it, which lets a test build point at a simulated chain.
export const PROGRESS_CONTRACT = import.meta.env.VITE_PROGRESS_CONTRACT || '0x1Ee20De0867047AbaBE540F5cb86569E3ce17948';
// The block the contract was deployed in: the first block to scan for Hello events.
export const PROGRESS_START_BLOCK = Number(import.meta.env.VITE_PROGRESS_START_BLOCK) || 29071129;
export const MAINNET_CONTRACT = PROGRESS_CONTRACT;
export const LESSON_NET = 'mainnet';

export const LINKS = {
  botchain: 'https://botchain.ai',
  getBot: 'https://botchain.ai/en/help-center/docs/getting-started/get-bot-for-gas/',
  docs: 'https://dev-docs.botchain.ai/docs/intro',
  faucet: 'https://faucet.botchain.ai/basic',
  testnetExplorer: 'https://scan.bohr.life',
  mainnetExplorer: 'https://scan.botchain.ai',
  botguide: 'https://bot-guide.space/',
  github: 'https://github.com/Devs-GMT/first-block',
};
