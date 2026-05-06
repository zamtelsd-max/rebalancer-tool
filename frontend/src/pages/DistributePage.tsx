import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { fmtZMW } from '../utils/fmt';
import GPSButton from '../components/GPSButton';

interface Agent { id: string; agentCode: string; name: string; phone: string; town?: string; market?: string; province?: string; isRedFlagged: boolean; redFlagReason?: string }

const PROVINCES = ['Lusaka','Copperbelt','Central','Eastern','Northern','Luapula','Muchinga','North-Western','Southern','Western'];

export default function DistributePage() {
  const nav = useNavigate();
  const [type, setType] = useState<'CASH' | 'FLOAT'>('CASH');

  // Agent code input
  const [agentCode, setAgentCode]       = useState('');
  const [lookupResults, setLookupResults] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isNewAgent, setIsNewAgent]       = useState(false);

  // Agent detail fields (used when new agent or pre-filled from DB)
  const [agentName, setAgentName]       = useState('');
  const [agentPhone, setAgentPhone]     = useState('');
  const [agentTown, setAgentTown]       = useState('');
  const [agentMarket, setAgentMarket]   = useState('');
  const [agentProvince, setAgentProvince] = useState('');

  // Distribution fields
  const [amount, setAmount]       = useState('');
  const [txRef, setTxRef]         = useState('');
  const [notes, setNotes]         = useState('');
  const [lat, setLat]             = useState<number | null>(null);
  const [lng, setLng]             = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live search as user types agent code
  useEffect(() => {
    const q = agentCode.trim();
    if (q.length < 2) { setLookupResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const r = await api.get(`/rebalancer/agents/lookup?q=${encodeURIComponent(q)}`);
        setLookupResults(r.data);
      } catch { /* silent */ }
    }, 300);
  }, [agentCode]);

  const selectAgent = (a: Agent) => {
    setSelectedAgent(a);
    setAgentCode(a.agentCode);
    setAgentName(a.name);
    setAgentPhone(a.phone);
    setAgentTown(a.town ?? '');
    setAgentMarket(a.market ?? '');
    setAgentProvince(a.province ?? '');
    setIsNewAgent(false);
    setLookupResults([]);
    setLookupDone(true);
  };

  // When user presses Enter or clicks "Use this code" — treat as new agent
  const confirmNewAgent = () => {
    if (!agentCode.trim()) return;
    setSelectedAgent(null);
    setIsNewAgent(true);
    setLookupResults([]);
    setLookupDone(true);
    setAgentName(''); setAgentPhone(''); setAgentTown(''); setAgentMarket(''); setAgentProvince('');
  };

  const resetAgent = () => {
    setSelectedAgent(null); setIsNewAgent(false); setLookupDone(false);
    setAgentCode(''); setAgentName(''); setAgentPhone(''); setAgentTown(''); setAgentMarket(''); setAgentProvince('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupDone) { toast.error('Select or confirm an agent first'); return; }
    if (!agentName.trim()) { toast.error('Agent name is required'); return; }
    if (!agentPhone.trim()) { toast.error('Agent phone is required'); return; }
    if (!lat || !lng) { toast.error('GPS location is required'); return; }
    if (!txRef.trim()) { toast.error('Transaction reference is required'); return; }
    if (selectedAgent?.isRedFlagged && !notes.trim()) { toast.error('Notes required for red-flagged agents'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/rebalancer/distribute', {
        type,
        agentCode: agentCode.trim().toUpperCase(),
        agentName: agentName.trim(),
        agentPhone: agentPhone.trim(),
        agentTown: agentTown.trim() || undefined,
        agentMarket: agentMarket.trim() || undefined,
        agentProvince: agentProvince.trim() || undefined,
        amount: parseFloat(amount),
        transactionRef: txRef.trim(),
        latitude: lat, longitude: lng,
        notes: notes.trim() || undefined,
      });
      const isNewDB = res.data.agent?.isNew;
      toast.success(`✅ ${fmtZMW(parseFloat(amount))} ${type} → ${agentName.trim()}${isNewDB ? ' (new agent saved 📌)' : ''}`);
      nav('/rebalancer');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Distribution failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-xl font-extrabold text-gray-900">Log Distribution</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Type toggle ── */}
        <div className="grid grid-cols-2 gap-3">
          {(['CASH', 'FLOAT'] as const).map(t => (
            <button type="button" key={t} onClick={() => setType(t)}
              className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${type === t ? 'border-brand-blue bg-green-50 text-brand-blue scale-[1.02] shadow-md' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
              {t === 'CASH' ? '💵 Cash' : '📱 Float'}
            </button>
          ))}
        </div>

        {/* ── Agent ── */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Agent Code <span className="text-red-500">*</span>
          </label>

          {/* Confirmed agent pill */}
          {lookupDone ? (
            <div className={`flex items-start gap-3 p-3 rounded-xl border-2 ${selectedAgent?.isRedFlagged ? 'border-red-400 bg-red-50' : isNewAgent ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-gray-900 font-mono">{agentCode.toUpperCase()}</p>
                  {isNewAgent && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                  {selectedAgent && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">KNOWN</span>}
                  {selectedAgent?.isRedFlagged && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">🚩 FLAGGED</span>}
                </div>
                {selectedAgent && <p className="text-xs text-gray-600 mt-0.5">{selectedAgent.name} · {selectedAgent.phone}</p>}
                {selectedAgent?.isRedFlagged && <p className="text-xs text-red-600 font-semibold mt-1">⚠️ {selectedAgent.redFlagReason}</p>}
              </div>
              <button type="button" onClick={resetAgent} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
          ) : (
            /* Code search input */
            <div className="relative">
              <div className="flex gap-2">
                <input
                  value={agentCode}
                  onChange={e => setAgentCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), confirmNewAgent())}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
                  placeholder="e.g. ZM-AG-0042 — type to search or enter new"
                  autoFocus
                />
                {agentCode.trim().length >= 2 && lookupResults.length === 0 && (
                  <button type="button" onClick={confirmNewAgent}
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 whitespace-nowrap">
                    + New
                  </button>
                )}
              </div>
              {lookupResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                  {lookupResults.map(a => (
                    <button key={a.id} type="button" onClick={() => selectAgent(a)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 ${a.isRedFlagged ? 'bg-red-50' : ''}`}>
                      <p className="text-sm font-bold text-gray-900 font-mono">{a.agentCode} {a.isRedFlagged && '🚩'}</p>
                      <p className="text-xs text-gray-500">{a.name} · {a.phone} · {a.town ?? '—'}</p>
                    </button>
                  ))}
                  <button type="button" onClick={confirmNewAgent} className="w-full text-left px-4 py-3 text-xs text-blue-600 font-bold hover:bg-blue-50">
                    + Use "{agentCode.toUpperCase()}" as new agent code
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Search existing agents or enter a new agent code and tap <strong>+ New</strong></p>
            </div>
          )}
        </div>

        {/* ── Agent detail fields — always shown once code is confirmed ── */}
        {lookupDone && (
          <div className={`space-y-3 rounded-2xl border p-4 ${isNewAgent ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-gray-50/40'}`}>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              {isNewAgent ? '📝 New Agent Details — will be saved for future use' : '✏️ Agent Details'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                <input value={agentName} onChange={e => setAgentName(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                  placeholder="Agent full name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Phone <span className="text-red-500">*</span></label>
                <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                  placeholder="260977…" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Town</label>
                <input value={agentTown} onChange={e => setAgentTown(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                  placeholder="e.g. Lusaka" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Market</label>
                <input value={agentMarket} onChange={e => setAgentMarket(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                  placeholder="e.g. Kalingalinga" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Province</label>
                <select value={agentProvince} onChange={e => setAgentProvince(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white">
                  <option value="">Select…</option>
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Amount ── */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Amount (ZMW) <span className="text-red-500">*</span></label>
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="e.g. 5000" />
        </div>

        {/* ── Transaction ref ── */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Zamtel Money Transaction Ref <span className="text-red-500">*</span></label>
          <input value={txRef} onChange={e => setTxRef(e.target.value)} required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Transaction reference from Zamtel Money" />
        </div>

        {/* ── GPS ── */}
        <GPSButton lat={lat} lng={lng} onCapture={(la, lo) => { setLat(la); setLng(lo); }} />

        {/* ── Notes ── */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Notes {selectedAgent?.isRedFlagged && <span className="text-red-500">* (required for flagged agent)</span>}
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            placeholder="Optional notes…" />
        </div>

        <button type="submit"
          disabled={submitting || !lookupDone || !amount || !txRef || !lat}
          className="w-full py-4 bg-brand-blue text-white rounded-2xl font-extrabold text-sm hover:bg-brand-blue-dark disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting…' : `✅ Submit ${type} Distribution`}
        </button>
      </form>
    </div>
  );
}
