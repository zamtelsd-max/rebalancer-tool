import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username.trim(), password);
      const u = JSON.parse(localStorage.getItem('rb_user') || '{}');
      nav(u.role === 'REBALANCER' ? '/rebalancer' : '/director');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zamtel-green flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-zamtel-green px-8 py-8 text-center">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-white font-extrabold text-xl leading-tight">Rebalancer Productivity Tool</h1>
          <p className="text-green-200 text-xs mt-1">Elthera Business Solution · Zamtel Money</p>
          <p className="text-green-300 text-[10px] mt-0.5 italic">Create Your World</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input autoFocus value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green"
              placeholder="e.g. samuel.mwape" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zamtel-green"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-zamtel-green text-white font-bold py-3.5 rounded-xl hover:bg-zamtel-green-dark transition-colors disabled:opacity-60 mt-2">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
