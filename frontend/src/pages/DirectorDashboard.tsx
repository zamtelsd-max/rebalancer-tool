import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { fmtZMW, fmtPct, getBand } from '../utils/fmt';
import ProgressBar from '../components/ProgressBar';
import DistributionMap, { MapPoint } from '../components/DistributionMap';

interface DashData {
  master: { cashBalance: number; floatBalance: number };
  today: { cash: number; float: number; agents: number; prospects: number };
  targets: { cash: number; float: number; visits: number; prospects: number };
  leaderboard: { id: string; name: string; score: number; cash: number; float: number; visits: number; prospects: number }[];
  redFlags: number; mtd: { wde: number; wdm: number };
}

interface Reb { id: string; name: string; region?: string; today: { cashPct: number; floatPct: number; visitsPct: number; prospectsPct: number }; score: number; cashBalance: number; floatBalance: number }

export default function DirectorDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [rebs, setRebs] = useState<Reb[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [allocModal, setAllocModal] = useState(false);
  const [allocReb, setAllocReb] = useState('');
  const [allocType, setAllocType] = useState<'CASH' | 'FLOAT'>('CASH');
  const [allocAmt, setAllocAmt] = useState('');
  const [allocRef, setAllocRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [d, r, m] = await Promise.all([
        api.get('/director/dashboard'),
        api.get('/director/rebalancers'),
        api.get('/rebalancer/distributions/map'),
      ]);
      setData(d.data); setRebs(r.data); setMapPoints(m.data);
    } catch { toast.error('Failed to load dashboard'); }
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const doAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocReb || !allocAmt) return;
    setSubmitting(true);
    try {
      await api.post('/director/allocate', { rebalancerId: allocReb, type: allocType, amount: parseFloat(allocAmt), reference: allocRef });
      toast.success(`✅ Allocated ${fmtZMW(parseFloat(allocAmt))} ${allocType}`);
      setAllocModal(false); setAllocAmt(''); setAllocRef(''); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Allocation failed'); }
    finally { setSubmitting(false); }
  };

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  const t = data.targets;

  return (
    <div className="sm:ml-52 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-extrabold text-gray-900">Director Dashboard</h1><p className="text-xs text-gray-500">Day {data.mtd.wde} of {data.mtd.wdm} · MTD</p></div>
        <button onClick={() => setAllocModal(true)} className="bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-blue-dark">💸 Allocate</button>
      </div>

      {/* Master balances */}
      <div className="grid grid-cols-2 gap-3">
        {[{ label: 'Master Cash', val: data.master.cashBalance, icon: '💵' }, { label: 'Master Float', val: data.master.floatBalance, icon: '📱' }].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl mb-1">{c.icon}</p>
            <p className="text-lg font-extrabold text-brand-blue">{fmtZMW(c.val)}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Today's national KPIs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">📊 Today — National</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Cash Distributed', val: data.today.cash, target: t.cash, pct: Math.round((data.today.cash / t.cash) * 100), fmt: fmtZMW, weight: 25 },
            { label: 'Float Distributed', val: data.today.float, target: t.float, pct: Math.round((data.today.float / t.float) * 100), fmt: fmtZMW, weight: 25 },
            { label: 'Agents Visited', val: data.today.agents, target: t.visits, pct: Math.round((data.today.agents / t.visits) * 100), fmt: (v: number) => String(v), weight: 30 },
            { label: 'Prospects', val: data.today.prospects, target: t.prospects, pct: Math.round((data.today.prospects / t.prospects) * 100), fmt: (v: number) => String(v), weight: 20 },
          ].map(k => (
            <ProgressBar key={k.label} label={k.label} pct={k.pct} actual={k.fmt(k.val)} target={k.fmt(k.target)} weight={k.weight} />
          ))}
        </div>
        {data.redFlags > 0 && <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-700 font-semibold">⚠️ {data.redFlags} red-flagged agent{data.redFlags > 1 ? 's' : ''} — <Link to="/agents" className="underline">review</Link></div>}
      </div>

      {/* Rebalancer table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-bold text-gray-800">👷 Rebalancers — Today's Performance</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>{['Name', 'Region', 'Cash%', 'Float%', 'Visits%', 'Pros%', 'Score', 'Cash Bal', 'Float Bal'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rebs.map(r => {
                const band = getBand(r.score);
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.region ?? '—'}</td>
                    {[r.today.cashPct, r.today.floatPct, r.today.visitsPct, r.today.prospectsPct].map((p, i) => (
                      <td key={i} className={`px-3 py-2 font-bold ${p >= 80 ? 'text-green-600' : p >= 60 ? 'text-yellow-600' : p >= 40 ? 'text-orange-500' : 'text-red-600'}`}>{p}%</td>
                    ))}
                    <td className={`px-3 py-2 font-extrabold ${band.color}`}>{r.score.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-brand-blue font-semibold">{fmtZMW(r.cashBalance)}</td>
                    <td className="px-3 py-2 text-blue-600 font-semibold">{fmtZMW(r.floatBalance)}</td>
                  </tr>
                );
              })}
              {rebs.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">No rebalancers yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">🏆 Today's Top 5</h2>
          <Link to="/leaderboard" className="text-xs text-brand-blue font-semibold">Full MTD Leaderboard →</Link>
        </div>
        <div className="space-y-2">
          {data.leaderboard.map((r, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-lg">{medals[i] ?? `#${i + 1}`}</span>
                <span className="flex-1 font-semibold text-sm text-gray-800">{r.name}</span>
                <span className={`font-extrabold text-sm ${getBand(r.score).color}`}>{r.score.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* GPS Field Map — all rebalancers today */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">📍 Today's Field Map</h2>
          <span className="text-xs text-gray-400">{mapPoints.length} distribution{mapPoints.length !== 1 ? 's' : ''} nationwide</span>
        </div>
        {mapPoints.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-sm font-medium">No distributions logged today yet</p>
          </div>
        ) : (
          <>
            <DistributionMap points={mapPoints} height="320px" />
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brand-blue inline-block" /> Cash</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brand-gold inline-block" /> Float</span>
              <span className="text-gray-400 ml-auto italic">Tap a pin for details</span>
            </div>
          </>
        )}
      </div>

      {/* Allocate Modal */}
      {allocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">💸 Allocate Value</h2>
              <button onClick={() => setAllocModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={doAllocate} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Rebalancer</label>
                <select value={allocReb} onChange={e => setAllocReb(e.target.value)} required className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none">
                  <option value="">Select rebalancer…</option>
                  {rebs.map(r => <option key={r.id} value={r.id}>{r.name} (Cash: {fmtZMW(r.cashBalance)}, Float: {fmtZMW(r.floatBalance)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['CASH', 'FLOAT'] as const).map(tp => (
                  <button type="button" key={tp} onClick={() => setAllocType(tp)}
                    className={`py-3 rounded-xl font-bold text-sm border-2 ${allocType === tp ? 'border-brand-blue bg-green-50 text-brand-blue' : 'border-gray-200 text-gray-400'}`}>
                    {tp === 'CASH' ? '💵 Cash' : '📱 Float'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Amount (ZMW)</label>
                <input type="number" min="1" step="0.01" value={allocAmt} onChange={e => setAllocAmt(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Reference (optional)</label>
                <input value={allocRef} onChange={e => setAllocRef(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="Transfer reference" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAllocModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-brand-blue text-white rounded-xl text-sm font-bold disabled:opacity-60 hover:bg-brand-blue-dark">
                  {submitting ? 'Allocating…' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
