import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface DailyPoint { date: string; cash: number; float: number; agents: number }

export default function ReportsPage() {
  const [daily, setDaily] = useState<DailyPoint[]>([]);

  useEffect(() => {
    api.get('/director/reports?days=30').then(r => setDaily(r.data.daily)).catch(() => toast.error('Failed to load reports'));
  }, []);

  return (
    <div className="sm:ml-52 space-y-6">
      <h1 className="text-xl font-extrabold text-gray-900">📊 Reports & Analytics</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">Daily Cash & Float Distributed (Last 30 days)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `K${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `K${v.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="cash" stroke="#00843D" strokeWidth={2} dot={false} name="Cash" />
            <Line type="monotone" dataKey="float" stroke="#E4007C" strokeWidth={2} dot={false} name="Float" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">Daily Agents Visited</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="agents" fill="#00843D" name="Agents Visited" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {daily.length === 0 && <p className="text-center text-gray-400 py-8">No distribution data yet</p>}
    </div>
  );
}
