import { Interface, formatEther } from 'ethers';
import { NETWORKS, PROGRESS_ABI, GRADUATION_ABI, connect, hasWallet, provider, signer, switchTo, wallet, withRetry } from './chain.js';

const ifaces = [new Interface(PROGRESS_ABI), new Interface(GRADUATION_ABI)];

/** Makes sure MetaMask is installed, connected, on the right network and holds some BOT for gas. */
export async function prepare(which) {
  const net = NETWORKS[which];
  if (!hasWallet()) throw Object.assign(new Error('no-wallet'), { kind: 'no-wallet' });
  if (!wallet.address) await connect();
  if (wallet.chainId !== net.id) await switchTo(which);
  const bal = await withRetry(() => provider(which).getBalance(wallet.address));
  if (bal === 0n) throw Object.assign(new Error('no-gas'), { kind: 'no-gas', which });
  return signer();
}

/** Turns any wallet or contract error into one plain sentence that says what to do next. */
export function explain(e) {
  if (e?.kind === 'no-wallet') return 'MetaMask wasn\'t found. Install it, then reload this page.';
  if (e?.kind === 'no-gas') return 'Your wallet has no BOT on mainnet to pay gas. Get a little BOT first, then try again.';
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED' || /user rejected|denied/i.test(e?.message || '')) return 'You cancelled it in MetaMask. Press the button to try again.';
  const name = e?.revert?.name || decodeName(e);
  const args = e?.revert?.args || [];
  switch (name) {
    case 'NotDone': return `Finish lesson ${args[0]} first, then come back.`;
    case 'NoGas': return 'The contract sees no BOT in your wallet. Get a little BOT for gas first.';
    case 'TipTooSmall': return 'The tip has to be at least 0.001 BOT.';
    case 'BadName': return 'Your name has to be between 1 and 24 characters.';
    case 'NotACounter': return 'That address isn\'t a First Block Counter. Deploy one with the button above.';
    case 'NotYourCounter': return 'That Counter belongs to a different wallet. Deploy your own with this wallet.';
    case 'CountTooLow': return `We found your Counter, but count is ${args[0]}. Press increment ${3 - Number(args[0])} more time${3 - Number(args[0]) === 1 ? '' : 's'}.`;
    case 'NotFinished': return `Pass all five lessons first. You're at ${args[0]} of 5.`;
    case 'AlreadyGraduated': return 'This wallet has already graduated.';
    case 'NoteTooLong': return 'Your note can be 80 characters at most.';
    default: break;
  }
  if (/insufficient funds/i.test(e?.message || '')) return 'Not enough BOT to pay for gas. Get some, then try again.';
  if (/network|timeout|fetch|ECONN|failed to/i.test(e?.message || '')) return 'The network is slow right now. Wait a moment and press the button again.';
  return 'That transaction didn\'t go through. Check your network in MetaMask and try again.';
}

function decodeName(e) {
  const data = e?.data || e?.info?.error?.data;
  if (typeof data !== 'string' || data.length < 10) return null;
  for (const i of ifaces) { try { const p = i.parseError(data); if (p) { e.revert = { name: p.name, args: [...p.args] }; return p.name; } } catch { /* try the next one */ } }
  return null;
}

/** Sends one transaction and reports each stage: 'wallet' (confirm in MetaMask), 'pending', then 'done'. */
export async function runTx(which, build, ui) {
  ui('wallet');
  const s = await prepare(which);
  const tx = await build(s);
  ui('pending', tx.hash);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('reverted');
  ui('done', receipt);
  return receipt;
}

export const fmtBal = (v) => Number(formatEther(v)).toLocaleString('en-US', { maximumFractionDigits: 4 });
