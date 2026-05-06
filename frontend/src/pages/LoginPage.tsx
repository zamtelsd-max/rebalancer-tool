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
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header — blue bg with gold accents */}
        <div className="bg-brand-blue px-8 py-8 text-center relative overflow-hidden">
          {/* Decorative gold circles */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-brand-gold/20" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-brand-gold/15" />

          {/* Logo mark */}
          <div className="relative inline-flex w-16 h-16 rounded-2xl bg-brand-gold items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-extrabold text-2xl">E</span>
          </div>

          <h1 className="text-white font-extrabold text-xl leading-tight relative">
            Rebalancer Productivity
          </h1>
          <p className="text-brand-gold-light text-xs mt-1 font-semibold relative">
            Elthera Business Solution
          </p>
          <p className="text-white/60 text-[10px] mt-0.5 relative">Zamtel Money · Create Your World</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input autoFocus value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue transition-colors"
              placeholder="e.g. samuel.mwape" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue transition-colors"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand-blue text-white font-extrabold py-4 rounded-xl hover:bg-brand-blue-dark transition-colors disabled:opacity-60 shadow-md shadow-brand-blue/30 mt-2">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
          {/* Gold underline accent */}
          <div className="h-1 w-16 rounded-full bg-brand-gold mx-auto mt-2" />
        </form>
      </div>
    </div>
  );
}
