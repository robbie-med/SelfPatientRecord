import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index';
import DisclaimerBanner from './DisclaimerBanner';

const NAV_ITEMS = [
  { to: '/inbox', icon: '📥', key: 'nav.inbox' },
  { to: '/timeline', icon: '📅', key: 'nav.timeline' },
  { to: '/labs', icon: '🧪', key: 'nav.labs' },
  { to: '/imaging', icon: '🩻', key: 'nav.imaging' },
  { to: '/meds', icon: '💊', key: 'nav.meds' },
  { to: '/prevention', icon: '🛡️', key: 'nav.prevention' },
  { to: '/ask', icon: '💬', key: 'nav.ask' },
  { to: '/settings', icon: '⚙️', key: 'nav.settings' },
];

export default function Layout() {
  const { t } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ko' ? 'en' : 'ko');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-slate-200 shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="text-lg font-semibold text-white">HealthBinder</div>
          <div className="text-xs text-slate-400 mt-0.5">Personal Health Record</div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-700 space-y-2">
          <button
            onClick={toggleLanguage}
            className="w-full text-xs text-slate-400 hover:text-white transition-colors text-left"
          >
            {i18n.language === 'ko' ? '🌐 English' : '🌐 한국어'}
          </button>
          <div className="text-xs text-slate-600">v0.1.0 · Local-first</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <DisclaimerBanner />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-gray-200 bg-white">
          {NAV_ITEMS.slice(0, 6).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mt-0.5 truncate max-w-full px-1">{t(item.key).split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
