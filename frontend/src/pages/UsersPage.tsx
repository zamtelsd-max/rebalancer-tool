import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface User { id: string; username: string; name: string; role: string; isActive: boolean; region?: string }
const ROLES = ['DIRECTOR', 'ADMIN', 'REBALANCER', 'SUPERVISOR'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'REBALANCER', region: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/director/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users'));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/director/users', form);
      toast.success(`✅ User ${form.username} created`);
      setShowForm(false); setForm({ username: '', name: '', password: '', role: 'REBALANCER', region: '' }); load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/director/users/${user.id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="sm:ml-52 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">👥 User Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-blue-dark">+ Add User</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">New User</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Username', key: 'username', ph: 'e.g. john.doe', type: 'text' }, { label: 'Full Name', key: 'name', ph: 'e.g. John Doe', type: 'text' }, { label: 'Password', key: 'password', ph: '••••••••', type: 'password' }, { label: 'Region', key: 'region', ph: 'e.g. Lusaka', type: 'text' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-gray-700 block mb-1">{f.label}</label>
                  <input type={f.type} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={['username', 'name', 'password'].includes(f.key)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder={f.ph} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl text-sm font-bold disabled:opacity-60">{submitting ? 'Creating…' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>{['Username', 'Name', 'Role', 'Region', 'Status', ''].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5 font-mono text-gray-700">{u.username}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full font-bold ${u.role === 'DIRECTOR' ? 'bg-purple-100 text-purple-700' : u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : u.role === 'REBALANCER' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                  <td className="px-3 py-2.5 text-gray-500">{u.region ?? '—'}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleActive(u)} className={`text-xs font-bold hover:underline ${u.isActive ? 'text-red-500' : 'text-green-600'}`}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
