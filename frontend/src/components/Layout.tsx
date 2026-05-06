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
      {/* Top nav — deep blue with gold accent */}
      <header className="bg-brand-blue text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Gold square logo mark */}
            <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-sm">E</span>
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight">Rebalancer Productivity</p>
              <p className="text-[10px] text-brand-gold-light leading-tight">Elthera Business Solution · Zamtel Money</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/15 px-2 py-1 rounded-full hidden sm:block max-w-[140px] truncate">{user.name}</span>
            <span className="text-[10px] bg-brand-gold/30 text-brand-gold-light px-2 py-0.5 rounded-full font-bold hidden sm:block">{user.role}</span>
            <button onClick={() => { logout(); nav('/login'); }}
              className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-full transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Page content with left gutter on desktop */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5 sm:pl-56">{children}</main>

      {/* Bottom nav (mobile only) */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 z-40 sm:hidden">
        <div className="flex overflow-x-auto">
          {items.map(item => (
            <Link key={item.to} to={item.to}
              className={`flex-1 min-w-max py-3 px-3 text-center text-[11px] font-semibold transition-colors ${
                loc.pathname === item.to
                  ? 'text-brand-blue border-t-2 border-brand-gold'
                  : 'text-gray-500'
              }`}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Side nav (desktop only) */}
      <nav className="hidden sm:flex fixed left-0 top-[57px] bottom-0 w-52 bg-white border-r border-gray-200 flex-col pt-4 z-30">
        {/* Brand stripe */}
        <div className="mx-3 mb-4 p-3 rounded-xl bg-brand-blue text-white">
          <p className="text-[10px] font-semibold text-brand-gold-light">{user.role}</p>
          <p className="text-sm font-bold leading-tight truncate">{user.name}</p>
        </div>
        {items.map(item => (
          <Link key={item.to} to={item.to}
            className={`mx-2 mb-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              loc.pathname === item.to
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-blue-50 hover:text-brand-blue'
            }`}>
            {item.label}
          </Link>
        ))}
        {/* Gold divider at bottom */}
        <div className="mx-3 mt-auto mb-4 h-1 rounded-full bg-brand-gold/40" />
      </nav>
    </div>
  );
}
