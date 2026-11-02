// XP and streaks are just for fun and live only in this browser. The chain is always the source of truth for progress.
const key = (addr) => `fb-xp-${addr.toLowerCase()}`;
const read = (addr) => { try { return JSON.parse(localStorage.getItem(key(addr))) || { lessons: {}, streak: { last: '', n: 0 } }; } catch { return { lessons: {}, streak: { last: '', n: 0 } }; } };
const write = (addr, v) => { try { localStorage.setItem(key(addr), JSON.stringify(v)); } catch { /* storage may be blocked */ } };
const day = (d = new Date()) => d.toISOString().slice(0, 10);

/** Marks the first time a lesson page is opened, so a fast finish can earn the bonus. */
export function startLesson(addr, n) {
  if (!addr) return;
  const v = read(addr);
  v.started = v.started || {};
  if (!v.started[n]) v.started[n] = Date.now();
  const today = day(), yesterday = day(new Date(Date.now() - 864e5));
  if (v.streak.last !== today) { v.streak.n = v.streak.last === yesterday ? v.streak.n + 1 : 1; v.streak.last = today; }
  write(addr, v);
}

/** Awards 100 XP for a passed lesson, plus 50 if it took under 10 minutes. Returns the XP just earned (0 if already awarded). */
export function award(addr, n) {
  const v = read(addr);
  if (v.lessons[n]) return 0;
  const fast = v.started?.[n] && Date.now() - v.started[n] < 10 * 60 * 1000;
  v.lessons[n] = 100 + (fast ? 50 : 0);
  write(addr, v);
  return v.lessons[n];
}

/** Total XP, counting 100 for any lesson the chain says is done but this browser never saw. */
export function totalXp(addr, flags) {
  if (!addr) return 0;
  const v = read(addr);
  let sum = 0;
  for (let n = 1; n <= 5; n++) { if (v.lessons[n]) sum += v.lessons[n]; else if (flags & (1 << (n - 1))) sum += 100; }
  return sum;
}

export const streakOf = (addr) => (addr ? read(addr).streak.n : 0);
