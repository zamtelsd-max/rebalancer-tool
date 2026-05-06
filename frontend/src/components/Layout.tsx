import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = (role: string) => {
  const base = [{ to: '/leaderboard', label: '🏆 Leaderboard' }];
  if (role === 'REBALANCER') return [
    { to: '/rebalancer', label: '🏠 Dashboard' },
    { to: '/distribute', label: '💸 Distribute' },
    { to: '/prospects/new', label: '➕ Prospect' },
    { to: '/my-prospects', label: '📋 Prospects' },
    ...base,
  ];
  if (role === 'DIRECTOR' || role === 'ADMIN') return [
    { to: '/director', label: '🏠 Dashboard' },
    { to: '/agents', label: '🤝 Agents' },
    { to: '/reports', label: '📊 Reports' },
    { to: '/targets', label: '🎯 Targets' },
    { to: '/users', label: '👥 Users' },
    ...base,
  ];
  return [{ to: '/director', label: '🏠 Overview' }, { to: '/agents', label: '🤝 Agents' }, ...base];
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  if (!user) return null;
  const items = navItems(user.role);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-zamtel-green text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-extrabold text-sm leading-tight">Rebalancer Productivity Tool</p>
            <p className="text-[10px] text-green-200 leading-tight">Elthera · Zamtel Money</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full hidden sm:block">{user.name}</span>
            <button onClick={() => { logout(); nav('/login'); }} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors">Logout</button>
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 z-40 sm:hidden">
        <div className="flex overflow-x-auto">
          {items.map(item => (
            <Link key={item.to} to={item.to}
              className={`flex-1 min-w-max py-3 px-3 text-center text-[11px] font-semibold transition-colors ${loc.pathname === item.to ? 'text-zamtel-green border-t-2 border-zamtel-green' : 'text-gray-500'}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <nav className="hidden sm:flex fixed left-0 top-16 bottom-0 w-52 bg-white border-r border-gray-200 flex-col pt-4 z-30">
        {items.map(item => (
          <Link key={item.to} to={item.to}
            className={`mx-2 mb-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${loc.pathname === item.to ? 'bg-zamtel-green text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
