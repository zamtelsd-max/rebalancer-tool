import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { fmtZMW, fmtDate } from '../utils/fmt';

interface TV { id: string; version: number; cashTarget: number; floatTarget: number; visitsTarget: number; prospectsTarget: number; isActive: boolean; effectiveFrom: string; notes?: string }

export default function TargetsPage() {
  const [targets, setTargets] = useState<TV[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cashT, setCashT] = useState('30000');
  const [floatT, setFloatT] = useState('30000');
  const [visitsT, setVisitsT] = useState('35');
  const [prospectsT, setProspectsT] = useState('5');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/director/targets').then(r => setTargets(r.data)).catch(() => toast.error('Failed to load targets'));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/director/targets', { cashTarget: parseFloat(cashT), floatTarget: parseFloat(floatT), visitsTarget: parseInt(visitsT), prospectsTarget: parseInt(prospectsT), notes });
      toast.success('✅ New target version created');
      setShowForm(false); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const active = targets.find(t => t.isActive);

  return (
    <div className="sm:ml-52 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">🎯 Target Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-zamtel-green text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-zamtel-green-dark">+ New Version</button>
      </div>

      {active && (
        <div className="bg-green-50 border-2 border-zamtel-green rounded-2xl p-4">
          <p className="text-xs font-bold text-zamtel-green mb-2">✅ ACTIVE — Version {active.version}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-gray-500 text-xs">Cash Target</p><p className="font-extrabold text-zamtel-green">{fmtZMW(active.cashTarget)}/day</p></div>
            <div><p className="text-gray-500 text-xs">Float Target</p><p className="font-extrabold text-zamtel-green">{fmtZMW(active.floatTarget)}/day</p></div>
            <div><p className="text-gray-500 text-xs">Agents Target</p><p className="font-extrabold text-gray-800">{active.visitsTarget}/day</p></div>
            <div><p className="text-gray-500 text-xs">Prospects Target</p><p className="font-extrabold text-gray-800">{active.prospectsTarget}/day</p></div>
          </div>
          {active.notes && <p className="text-xs text-gray-500 mt-2 italic">{active.notes}</p>}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">New Target Version</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Cash Target (K/day)', val: cashT, set: setCashT }, { label: 'Float Target (K/day)', val: floatT, set: setFloatT }, { label: 'Agents Visits/day', val: visitsT, set: setVisitsT }, { label: 'Prospects/day', val: prospectsT, set: setProspectsT }].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{f.label}</label>
                  <input type="number" min="1" value={f.val} onChange={e => f.set(e.target.value)} required className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green" placeholder="e.g. Q2 target uplift 10%" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-zamtel-green text-white rounded-xl text-sm font-bold disabled:opacity-60">
                {submitting ? 'Creating…' : 'Create Version'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-bold text-gray-800">Version History</div>
        <div className="divide-y divide-gray-100">
          {targets.map(t => (
            <div key={t.id} className={`px-4 py-3 flex items-center gap-4 ${t.isActive ? 'bg-green-50/50' : ''}`}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>v{t.version}</span>
              <div className="flex-1 text-xs text-gray-600">
                Cash {fmtZMW(t.cashTarget)} · Float {fmtZMW(t.floatTarget)} · {t.visitsTarget} agents · {t.prospectsTarget} prospects
              </div>
              <span className="text-xs text-gray-400">{fmtDate(t.effectiveFrom)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
