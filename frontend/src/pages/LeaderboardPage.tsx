import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { getBand, fmtZMW } from '../utils/fmt';

interface Row { id: string; name: string; region?: string; cash: number; float: number; visits: number; prospects: number; cashPct: number; floatPct: number; visitsPct: number; prospectsPct: number; score: number }

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [wde, setWde] = useState(0);

  useEffect(() => {
    api.get('/director/leaderboard').then(r => { setRows(r.data.rows); setWde(r.data.wde); }).catch(() => toast.error('Failed to load leaderboard'));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="sm:ml-52 space-y-4">
      <h1 className="text-xl font-extrabold text-gray-900">🏆 MTD Leaderboard</h1>
      <p className="text-xs text-gray-500">Working day {wde} of month</p>

      {/* Podium */}
      {rows.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-4">
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const heights = ['h-20', 'h-28', 'h-16'];
            const band = getBand(r.score);
            return (
              <div key={r.id} className={`flex flex-col items-center ${heights[i]} justify-end`}>
                <p className="text-2xl mb-1">{medals[[1,0,2][i]]}</p>
                <div className={`w-20 rounded-t-xl flex flex-col items-center justify-center text-white py-2 ${i === 1 ? 'bg-zamtel-green' : 'bg-gray-400'} ${heights[i]}`}>
                  <p className="text-[10px] font-bold text-center px-1 leading-tight">{r.name.split(' ')[0]}</p>
                  <p className={`text-sm font-extrabold ${band.color.replace('text-', 'text-white')}`}>{r.score.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>{['#', 'Name', 'Region', 'Cash%', 'Float%', 'Visits%', 'Pros%', 'Score'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const band = getBand(r.score);
                return (
                  <tr key={r.id} className={`border-t border-gray-100 ${i < 3 ? 'bg-yellow-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5 font-bold text-gray-600">{medals[i] ?? `#${i + 1}`}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{r.name}</td>
                    <td className="px-3 py-2.5 text-gray-500">{r.region ?? '—'}</td>
                    {[r.cashPct, r.floatPct, r.visitsPct, r.prospectsPct].map((p, j) => (
                      <td key={j} className={`px-3 py-2.5 font-bold ${p >= 80 ? 'text-green-600' : p >= 60 ? 'text-yellow-600' : p >= 40 ? 'text-orange-500' : 'text-red-600'}`}>{p}%</td>
                    ))}
                    <td className={`px-3 py-2.5 font-extrabold ${band.color}`}>{r.score.toFixed(1)}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
