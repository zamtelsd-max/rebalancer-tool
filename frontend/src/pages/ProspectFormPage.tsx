import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import GPSButton from '../components/GPSButton';

const PROVINCES = ['Lusaka','Copperbelt','Central','Eastern','Northern','Luapula','Muchinga','North-Western','Southern','Western'];
const STAGES = ['CONTACTED','INTERESTED','SUBMITTED'] as const;

export default function ProspectFormPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [town, setTown] = useState('');
  const [market, setMarket] = useState('');
  const [province, setProvince] = useState('');
  const [stage, setStage] = useState<typeof STAGES[number]>('CONTACTED');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) { toast.error('GPS location is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/rebalancer/prospects', { name, phone, town, market, province, stage, notes, latitude: lat, longitude: lng });
      toast.success(`✅ Prospect ${name} captured`);
      nav('/rebalancer');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to save prospect'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-xl font-extrabold text-gray-900">Add Prospect</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <GPSButton lat={lat} lng={lng} onCapture={(la, lo) => { setLat(la); setLng(lo); }} />
        {[{ label: 'Full Name *', val: name, set: setName, ph: 'e.g. John Phiri', type: 'text' }, { label: 'Phone *', val: phone, set: setPhone, ph: '260977…', type: 'tel' }, { label: 'Town', val: town, set: setTown, ph: 'e.g. Lusaka', type: 'text' }, { label: 'Market / Location', val: market, set: setMarket, ph: 'e.g. Kalingalinga Market', type: 'text' }].map(f => (
          <div key={f.label}>
            <label className="block text-sm font-bold text-gray-700 mb-1">{f.label}</label>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required={f.label.includes('*')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green" placeholder={f.ph} />
          </div>
        ))}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Province</label>
          <select value={province} onChange={e => setProvince(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green">
            <option value="">Select province…</option>
            {PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Stage</label>
          <div className="grid grid-cols-3 gap-2">
            {STAGES.map(s => (
              <button type="button" key={s} onClick={() => setStage(s)}
                className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${stage === s ? 'border-zamtel-green bg-green-50 text-zamtel-green' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green resize-none" placeholder="Additional notes…" />
        </div>
        <button type="submit" disabled={submitting || !lat} className="w-full py-4 bg-zamtel-pink text-white rounded-2xl font-extrabold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
          {submitting ? 'Saving…' : '✅ Save Prospect'}
        </button>
      </form>
    </div>
  );
}
