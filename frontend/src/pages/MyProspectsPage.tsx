import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { fmtDate } from '../utils/fmt';

interface Prospect { id: string; name: string; phone: string; town?: string; stage: string; notes?: string; createdAt: string }
const stageColor: Record<string, string> = { CONTACTED: 'bg-blue-100 text-blue-700', INTERESTED: 'bg-yellow-100 text-yellow-700', SUBMITTED: 'bg-orange-100 text-orange-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };

export default function MyProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  useEffect(() => { api.get('/rebalancer/prospects').then(r => setProspects(r.data)).catch(() => toast.error('Failed to load prospects')); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">📋 My Prospects</h1>
        <Link to="/prospects/new" className="bg-brand-gold text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90">+ Add</Link>
      </div>
      {prospects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold">No prospects yet</p>
          <Link to="/prospects/new" className="text-brand-gold text-sm font-bold mt-2 block">Add your first prospect →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {prospects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.phone} · {p.town ?? '—'}</p>
                  {p.notes && <p className="text-xs text-gray-400 mt-1 italic">{p.notes}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageColor[p.stage] ?? 'bg-gray-100 text-gray-600'}`}>{p.stage}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{fmtDate(p.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
