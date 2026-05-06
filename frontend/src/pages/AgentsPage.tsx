import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface Agent { id: string; agentCode: string; name: string; phone: string; town?: string; province?: string; isRedFlagged: boolean; redFlagReason?: string; lastVisitedAt?: string; daysAgo?: number; visitsMtd: number; cashMtd: number; floatMtd: number }
type Filter = 'all' | 'flagged' | 'stale';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Agent | null>(null);
  const [flagReason, setFlagReason] = useState('');

  const load = () => api.get('/director/agents').then(r => setAgents(r.data)).catch(() => toast.error('Failed to load agents'));
  useEffect(() => { load(); }, []);

  const toggleFlag = async (agent: Agent) => {
    try {
      await api.patch(`/director/agents/${agent.id}/flag`, { flag: !agent.isRedFlagged, reason: flagReason });
      toast.success(agent.isRedFlagged ? '✅ Flag removed' : '🚩 Agent flagged');
      setSelected(null); setFlagReason(''); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const filtered = agents.filter(a => {
    if (filter === 'flagged') return a.isRedFlagged;
    if (filter === 'stale') return a.daysAgo === null || a.daysAgo >= 7;
    return true;
  });

  return (
    <div className="sm:ml-52 space-y-4">
      <h1 className="text-xl font-extrabold text-gray-900">🤝 Agent Intelligence Board</h1>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'flagged', 'stale'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${filter === f ? 'border-brand-blue bg-green-50 text-brand-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {f === 'all' ? `All (${agents.length})` : f === 'flagged' ? `🚩 Flagged (${agents.filter(a => a.isRedFlagged).length})` : `⏰ Not visited 7d+ (${agents.filter(a => a.daysAgo === null || a.daysAgo >= 7).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>{['Agent', 'Phone', 'Town', 'Last Visit', 'Visits MTD', 'Cash MTD', 'Float MTD', 'Status', ''].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className={`border-t border-gray-100 hover:bg-gray-50 ${a.isRedFlagged ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><p className="font-semibold text-gray-900">{a.name}</p><p className="text-gray-400 font-mono">{a.agentCode}</p></td>
                  <td className="px-3 py-2.5 font-mono text-gray-600">{a.phone}</td>
                  <td className="px-3 py-2.5 text-gray-600">{a.town ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {a.lastVisitedAt ? <span className={`font-semibold ${(a.daysAgo ?? 99) >= 7 ? 'text-red-600' : (a.daysAgo ?? 99) >= 3 ? 'text-yellow-600' : 'text-green-600'}`}>{a.daysAgo}d ago</span> : <span className="text-gray-400">Never</span>}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-700">{a.visitsMtd}</td>
                  <td className="px-3 py-2.5 text-brand-blue font-semibold">K{a.cashMtd.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-blue-600 font-semibold">K{a.floatMtd.toLocaleString()}</td>
                  <td className="px-3 py-2.5">{a.isRedFlagged ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🚩 Flagged</span> : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✅ Clear</span>}</td>
                  <td className="px-3 py-2.5"><button onClick={() => setSelected(a)} className="text-xs text-brand-blue font-bold hover:underline">Manage</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">No agents found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="text-sm space-y-1 text-gray-700 mb-4">
              <p><span className="font-semibold">Code:</span> {selected.agentCode}</p>
              <p><span className="font-semibold">Phone:</span> {selected.phone}</p>
              <p><span className="font-semibold">Town:</span> {selected.town ?? '—'}</p>
              <p><span className="font-semibold">Visits MTD:</span> {selected.visitsMtd}</p>
              <p><span className="font-semibold">Cash MTD:</span> K{selected.cashMtd.toLocaleString()}</p>
              <p><span className="font-semibold">Float MTD:</span> K{selected.floatMtd.toLocaleString()}</p>
              {selected.isRedFlagged && <p className="text-red-600 font-semibold">🚩 Flagged: {selected.redFlagReason}</p>}
            </div>
            {!selected.isRedFlagged && (
              <div className="mb-3">
                <label className="text-sm font-bold text-gray-700 block mb-1">Flag reason</label>
                <input value={flagReason} onChange={e => setFlagReason(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Reason for flagging…" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={() => toggleFlag(selected)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${selected.isRedFlagged ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {selected.isRedFlagged ? '✅ Remove Flag' : '🚩 Add Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
