import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { fmtZMW } from '../utils/fmt';
import GPSButton from '../components/GPSButton';

interface Agent { id: string; agentCode: string; name: string; phone: string; town?: string; isRedFlagged: boolean; redFlagReason?: string }

export default function DistributePage() {
  const nav = useNavigate();
  const [type, setType] = useState<'CASH' | 'FLOAT'>('CASH');
  const [query, setQuery] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [amount, setAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setAgents([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try { const r = await api.get(`/rebalancer/agents/lookup?q=${encodeURIComponent(query)}`); setAgents(r.data); }
      catch { /* silent */ }
    }, 300);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { toast.error('Select an agent'); return; }
    if (!lat || !lng) { toast.error('GPS location is required'); return; }
    if (!txRef.trim()) { toast.error('Transaction reference is required'); return; }
    if (selected.isRedFlagged && !notes.trim()) { toast.error('Notes required for red-flagged agents'); return; }

    setSubmitting(true);
    try {
      await api.post('/rebalancer/distribute', {
        type, agentCode: selected.agentCode, agentName: selected.name, agentPhone: selected.phone,
        amount: parseFloat(amount), transactionRef: txRef.trim(), latitude: lat, longitude: lng, notes: notes.trim(),
      });
      toast.success(`✅ ${fmtZMW(parseFloat(amount))} ${type} distributed to ${selected.name}`);
      nav('/rebalancer');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Distribution failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-xl font-extrabold text-gray-900">Log Distribution</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-3">
          {(['CASH', 'FLOAT'] as const).map(t => (
            <button type="button" key={t} onClick={() => setType(t)}
              className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${type === t ? 'border-zamtel-green bg-green-50 text-zamtel-green scale-[1.02] shadow-md' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
              {t === 'CASH' ? '💵 Cash' : '📱 Float'}
            </button>
          ))}
        </div>

        {/* Agent lookup */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Agent <span className="text-red-500">*</span></label>
          {selected ? (
            <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${selected.isRedFlagged ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500">{selected.agentCode} · {selected.phone} · {selected.town ?? '—'}</p>
                {selected.isRedFlagged && <p className="text-xs text-red-600 font-bold mt-1">⚠️ RED FLAGGED: {selected.redFlagReason}</p>}
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
          ) : (
            <div className="relative">
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green"
                placeholder="Search by agent code, name, or phone…" />
              {agents.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {agents.map(a => (
                    <button key={a.id} type="button" onClick={() => { setSelected(a); setQuery(''); setAgents([]); }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 ${a.isRedFlagged ? 'bg-red-50' : ''}`}>
                      <p className="text-sm font-semibold text-gray-800">{a.name} <span className="text-gray-400 font-normal">({a.agentCode})</span> {a.isRedFlagged && '🚩'}</p>
                      <p className="text-xs text-gray-400">{a.phone} · {a.town ?? '—'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Amount (ZMW) <span className="text-red-500">*</span></label>
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green" placeholder="e.g. 5000" />
        </div>

        {/* Transaction ref */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Zamtel Money Transaction Ref <span className="text-red-500">*</span></label>
          <input value={txRef} onChange={e => setTxRef(e.target.value)} required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green" placeholder="Transaction reference from Zamtel Money" />
        </div>

        {/* GPS */}
        <GPSButton lat={lat} lng={lng} onCapture={(la, lo) => { setLat(la); setLng(lo); }} />

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Notes {selected?.isRedFlagged && <span className="text-red-500">* (required for flagged agent)</span>}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green resize-none"
            placeholder="Optional notes…" />
        </div>

        <button type="submit" disabled={submitting || !selected || !lat || !txRef}
          className="w-full py-4 bg-zamtel-green text-white rounded-2xl font-extrabold text-sm hover:bg-zamtel-green-dark disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting…' : `✅ Submit ${type} Distribution`}
        </button>
      </form>
    </div>
  );
}
