import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from 'ethers';
import { MAINNET_CONTRACT, TESTNET_PROGRESS, LINKS } from './config.js';

export const NETWORKS = {
  testnet: { id: 968, hex: '0x3c8', name: 'BOT Chain Testnet', rpc: 'https://rpc.bohr.life', explorer: LINKS.testnetExplorer },
  mainnet: { id: 677, hex: '0x2a5', name: 'BOT Chain Mainnet', rpc: 'https://rpc.botchain.ai', explorer: LINKS.mainnetExplorer },
};

export const PROGRESS_ABI = [
  'function progressOf(address) view returns (uint8 done, uint8 flags)',
  'function stats() view returns (uint256[5])',
  'function checkIn()',
  'function tip() payable',
  'function sayHello(string name)',
  'function submitCounter(address c)',
  'function finishCounter()',
  'function counterOf(address) view returns (address)',
  'event LessonDone(address indexed learner, uint8 lesson)',
  'event Hello(address indexed learner, string name)',
];
export const GRADUATION_ABI = [
  'function graduate(string note)',
  'function total() view returns (uint256)',
  'function isGraduate(address) view returns (bool)',
  'function getGrads(uint256 from, uint256 count) view returns (tuple(address wallet, string note, uint64 at)[])',
  'event Graduated(uint256 indexed id, address indexed wallet)',
];

const reads = {
  testnet: new JsonRpcProvider(NETWORKS.testnet.rpc, NETWORKS.testnet.id, { staticNetwork: true }),
  mainnet: new JsonRpcProvider(NETWORKS.mainnet.rpc, NETWORKS.mainnet.id, { staticNetwork: true }),
};

/** Public RPCs reset connections now and then, so reads retry before giving up. */
export async function withRetry(fn, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw err;
}

export const progressRead = () => (TESTNET_PROGRESS ? new Contract(TESTNET_PROGRESS, PROGRESS_ABI, reads.testnet) : null);
export const graduationRead = () => (MAINNET_CONTRACT ? new Contract(MAINNET_CONTRACT, GRADUATION_ABI, reads.mainnet) : null);

export const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const isAddress = (v) => /^0x[0-9a-fA-F]{40}$/.test(v);

/** Everything the home page can learn about a wallet from the chain, one finished step at a time. */
export async function scanWallet(address, onStep) {
  const out = { done: null, balance: null, txs: null, graduate: null };
  const step = (key, val) => { out[key] = val; onStep(key, val); };
  try { step('balance', formatEther(await withRetry(() => reads.testnet.getBalance(address)))); } catch { step('balance', undefined); }
  try { step('txs', await withRetry(() => reads.testnet.getTransactionCount(address))); } catch { step('txs', undefined); }
  const p = progressRead();
  if (p) { try { const [done, flags] = await withRetry(() => p.progressOf(address)); step('done', { count: Number(done), flags: Number(flags) }); } catch { step('done', undefined); } }
  else step('done', null);
  const g = graduationRead();
  if (g) { try { step('graduate', await withRetry(() => g.isGraduate(address))); } catch { step('graduate', undefined); } }
  else step('graduate', null);
  return out;
}

/* ---------- MetaMask ---------- */
const listeners = new Set();
export const wallet = { address: null, chainId: null };
const emit = () => listeners.forEach((f) => f({ ...wallet }));
export const onWallet = (f) => { listeners.add(f); f({ ...wallet }); return () => listeners.delete(f); };
export const hasWallet = () => typeof window !== 'undefined' && !!window.ethereum;

export async function connect() {
  if (!hasWallet()) throw new Error('no-wallet');
  const accts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  wallet.address = accts[0] ?? null;
  wallet.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
  try { localStorage.setItem('fb-connected', '1'); } catch { /* storage may be blocked */ }
  emit();
}
export function disconnect() {
  wallet.address = null; wallet.chainId = null;
  try { localStorage.removeItem('fb-connected'); } catch { /* ignore */ }
  emit();
}
export async function switchTo(which) {
  const n = NETWORKS[which];
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: n.hex }] });
  } catch (e) {
    if (e?.code === 4902 || e?.code === -32603) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: n.hex, chainName: n.name, nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, rpcUrls: [n.rpc], blockExplorerUrls: [n.explorer] }] });
    } else throw e;
  }
}
export const signer = async () => new BrowserProvider(window.ethereum).getSigner();

if (hasWallet()) {
  window.ethereum.on?.('accountsChanged', (a) => { wallet.address = a[0] ?? null; emit(); });
  window.ethereum.on?.('chainChanged', (c) => { wallet.chainId = parseInt(c, 16); emit(); });
  let was = false;
  try { was = localStorage.getItem('fb-connected') === '1'; } catch { /* ignore */ }
  if (was) {
    window.ethereum.request({ method: 'eth_accounts' }).then(async (a) => {
      if (a[0]) { wallet.address = a[0]; wallet.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16); emit(); }
    }).catch(() => {});
  }
}
