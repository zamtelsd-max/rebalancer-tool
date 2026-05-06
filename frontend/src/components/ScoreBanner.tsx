import { getBand } from '../utils/fmt';
interface Props { score: number; wde: number; wdm: number; name?: string }
export default function ScoreBanner({ score, wde, wdm, name }: Props) {
  const band = getBand(score);
  return (
    <div className={`rounded-2xl border-2 p-4 ${band.bg} ${band.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 font-medium">MTD Weighted Score{name ? ` — ${name}` : ''}</p>
          <p className="text-4xl font-extrabold text-gray-900">{score.toFixed(1)}%</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${band.color}`}>{band.label}</p>
          <p className="text-xs text-gray-400 mt-1">Day {wde} of {wdm}</p>
        </div>
      </div>
      <div className="h-3 bg-white/60 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: score >= 80 ? '#00843D' : score >= 60 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626' }} />
        {[40, 60, 80].map(m => (
          <div key={m} className="absolute top-0 bottom-0 w-px bg-gray-400/40" style={{ left: `${m}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span>0</span><span>40</span><span>60</span><span>80</span><span>100</span>
      </div>
    </div>
  );
}
