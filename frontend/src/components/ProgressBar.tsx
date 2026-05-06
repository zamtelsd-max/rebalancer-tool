interface Props { label: string; pct: number; actual: string; target: string; weight?: number; color?: string }
export default function ProgressBar({ label, pct, actual, target, weight, color = '#003DA5' }: Props) {
  const capped = Math.min(pct, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-700">
        <span>{label}{weight ? <span className="text-gray-400 ml-1">({weight}%)</span> : ''}</span>
        <span className="font-bold" style={{ color: pct >= 80 ? '#003DA5' : pct >= 60 ? '#ca8a04' : pct >= 40 ? '#ea580c' : '#dc2626' }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${capped}%`, backgroundColor: color }} />
      </div>
      <div className="text-[10px] text-gray-400">{actual} / {target}</div>
    </div>
  );
}
