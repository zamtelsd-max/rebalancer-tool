export const fmtZMW = (v: number) =>
  'K' + v.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (v: number) => `${Math.min(Math.round(v), 999)}%`;

export const getBand = (score: number) => {
  if (score >= 80) return { label: '🟢 On Track', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-400' };
  if (score >= 60) return { label: '🟡 Needs Attention', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-400' };
  if (score >= 40) return { label: '🟠 Below Target', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-400' };
  return { label: '🔴 Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-400' };
};

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' });
