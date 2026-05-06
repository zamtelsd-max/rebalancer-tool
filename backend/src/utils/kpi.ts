/** Working days elapsed in current month (Mon–Fri, no holiday list) */
export function workingDaysElapsed(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let count = 0;
  for (let d = 1; d <= now.getDate(); d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return Math.max(count, 1);
}

export function workingDaysInMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function calcWeightedScore(p: {
  cashPct: number; floatPct: number; visitsPct: number; prospectsPct: number;
}): number {
  const score =
    Math.min(p.cashPct, 100) * 0.25 +
    Math.min(p.floatPct, 100) * 0.25 +
    Math.min(p.visitsPct, 100) * 0.30 +
    Math.min(p.prospectsPct, 100) * 0.20;
  return Math.round(score * 10) / 10;
}

export function getBand(score: number): string {
  if (score >= 80) return 'ON_TRACK';
  if (score >= 60) return 'NEEDS_ATTENTION';
  if (score >= 40) return 'BELOW_TARGET';
  return 'CRITICAL';
}

export function mtdStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function todayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
