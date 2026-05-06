import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { fmtZMW, fmtDate, fmtTime } from '../utils/fmt';
import ProgressBar from '../components/ProgressBar';
import ScoreBanner from '../components/ScoreBanner';

interface Dist { id: string; type: string; amount: number; agentCode: string; agentName: string; transactionRef: string; createdAt: string }
interface DashData {
  balances: { cash: number; float: number };
  today: { cash: number; float: number; visits: number; prospects: number; cashPct: number; floatPct: number; visitsPct: number; prospectsPct: number };
  mtd: { cash: number; float: number; visits: number; prospects: number; cashPct: number; floatPct: number; visitsPct: number; prospectsPct: number; score: number; band: string; wde: number; wdm: number };
  dailyTargets: { cash: number; float: number; visits: number; prospects: number };
  recentDistributions: Dist[];
}

export default function RebalancerDashboard() {
  const [data, setData] = useState<DashData | null>(null);

  const load = async () => {
    try { const r = await api.get('/rebalancer/dashboard'); setData(r.data); }
    catch { toast.error('Failed to load dashboard'); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  const t = data.dailyTargets;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">My Dashboard</h1>
        <span className="text-xs text-gray-400">Day {data.mtd.wde}/{data.mtd.wdm}</span>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        {[{ label: 'Cash Balance', val: data.balances.cash, color: 'text-brand-blue', icon: '💵' }, { label: 'Float Balance', val: data.balances.float, color: 'text-blue-600', icon: '📱' }].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl mb-1">{c.icon}</p>
            <p className={`text-xl font-extrabold ${c.color}`}>{fmtZMW(c.val)}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* MTD score banner */}
      <ScoreBanner score={data.mtd.score} wde={data.mtd.wde} wdm={data.mtd.wdm} />

      {/* Today's KPI rings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">📊 Today vs Daily Target</h2>
        <div className="space-y-3">
          <ProgressBar label="Cash Distributed" pct={data.today.cashPct} actual={fmtZMW(data.today.cash)} target={fmtZMW(t.cash)} weight={25} />
          <ProgressBar label="Float Distributed" pct={data.today.floatPct} actual={fmtZMW(data.today.float)} target={fmtZMW(t.float)} weight={25} />
          <ProgressBar label="Agents Visited" pct={data.today.visitsPct} actual={String(data.today.visits)} target={String(t.visits)} weight={30} />
          <ProgressBar label="New Prospects" pct={data.today.prospectsPct} actual={String(data.today.prospects)} target={String(t.prospects)} weight={20} />
        </div>
      </div>

      {/* MTD KPIs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">📅 MTD Progress</h2>
        <div className="space-y-3">
          <ProgressBar label="Cash MTD" pct={data.mtd.cashPct} actual={fmtZMW(data.mtd.cash)} target={fmtZMW(t.cash * data.mtd.wde)} weight={25} />
          <ProgressBar label="Float MTD" pct={data.mtd.floatPct} actual={fmtZMW(data.mtd.float)} target={fmtZMW(t.float * data.mtd.wde)} weight={25} />
          <ProgressBar label="Agents MTD" pct={data.mtd.visitsPct} actual={String(data.mtd.visits)} target={String(t.visits * data.mtd.wde)} weight={30} />
          <ProgressBar label="Prospects MTD" pct={data.mtd.prospectsPct} actual={String(data.mtd.prospects)} target={String(t.prospects * data.mtd.wde)} weight={20} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[{ to: '/distribute', label: '💸 Distribute', col: 'bg-brand-blue' }, { to: '/prospects/new', label: '➕ Prospect', col: 'bg-brand-gold' }, { to: '/leaderboard', label: '🏆 Rank', col: 'bg-gray-700' }].map(b => (
          <Link key={b.to} to={b.to} className={`${b.col} text-white text-center py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity`}>{b.label}</Link>
        ))}
      </div>

      {/* Recent distributions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-bold text-gray-800">🕐 Recent Distributions</div>
        {data.recentDistributions.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No distributions yet today</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentDistributions.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{d.type === 'CASH' ? '💵' : '📱'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{d.agentName} <span className="text-gray-400 font-normal">({d.agentCode})</span></p>
                  <p className="text-xs text-gray-400">{d.transactionRef} · {fmtDate(d.createdAt)} {fmtTime(d.createdAt)}</p>
                </div>
                <span className="font-bold text-brand-blue text-sm whitespace-nowrap">{fmtZMW(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
