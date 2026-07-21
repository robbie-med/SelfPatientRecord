import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index';
import DisclaimerBanner from './DisclaimerBanner';

interface NavItem { to: string; icon: string; key: string }
interface NavGroup { key: string; items: NavItem[] }

const TOP_ITEMS: NavItem[] = [
  { to: '/inbox', icon: '📥', key: 'nav.inbox' },
  { to: '/timeline', icon: '📅', key: 'nav.timeline' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'nav.groups.labsVitals',
    items: [
      { to: '/labs', icon: '🧪', key: 'nav.labs' },
      { to: '/imaging', icon: '🩻', key: 'nav.imaging' },
      { to: '/micronutrients', icon: '🥦', key: 'nav.micronutrients' },
    ],
  },
  {
    key: 'nav.groups.meds',
    items: [
      { to: '/meds', icon: '💊', key: 'nav.meds' },
      { to: '/med-log', icon: '📋', key: 'nav.medLog' },
      { to: '/supplements', icon: '🌿', key: 'nav.supplements' },
    ],
  },
  {
    key: 'nav.groups.body',
    items: [
      { to: '/surgeries', icon: '🔪', key: 'nav.surgeries' },
      { to: '/implants', icon: '🦾', key: 'nav.implants' },
      { to: '/lines', icon: '🩹', key: 'nav.lines' },
      { to: '/ultrasounds', icon: '📡', key: 'nav.ultrasounds' },
      { to: '/equipment', icon: '🔧', key: 'nav.equipment' },
      { to: '/sensitivities', icon: '🚫', key: 'nav.sensitivities' },
      { to: '/dialysis', icon: '💉', key: 'nav.dialysis' },
    ],
  },
  {
    key: 'nav.groups.reproductive',
    items: [
      { to: '/cycle-tracker', icon: '🌙', key: 'nav.cycleTracker' },
      { to: '/lh-tests', icon: '📈', key: 'nav.lhTests' },
      { to: '/pregnancy-tests', icon: '🧫', key: 'nav.pregnancyTests' },
      { to: '/pregnancies', icon: '🤰', key: 'nav.pregnancies' },
      { to: '/kick-counter', icon: '🦶', key: 'nav.kickCounter' },
      { to: '/contractions', icon: '⏱️', key: 'nav.contractions' },
      { to: '/birth-plans', icon: '📝', key: 'nav.birthPlans' },
      { to: '/feeding-log', icon: '🍼', key: 'nav.feedingLog' },
      { to: '/jaundice', icon: '👶', key: 'nav.jaundice' },
      { to: '/pregnancy-outcomes', icon: '🕊️', key: 'nav.pregnancyOutcomes' },
      { to: '/sex-events', icon: '❤️', key: 'nav.sexEvents' },
    ],
  },
  {
    key: 'nav.groups.mindSelf',
    items: [
      { to: '/mood', icon: '🙂', key: 'nav.mood' },
      { to: '/screenings', icon: '📊', key: 'nav.screenings' },
      { to: '/experiments', icon: '🔬', key: 'nav.experiments' },
      { to: '/illness', icon: '🤒', key: 'nav.illness' },
    ],
  },
  {
    key: 'nav.groups.carePlan',
    items: [
      { to: '/prevention', icon: '🛡️', key: 'nav.prevention' },
      { to: '/reminders', icon: '🔔', key: 'nav.reminders' },
      { to: '/attachments', icon: '📎', key: 'nav.attachments' },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/ask', icon: '💬', key: 'nav.ask' },
  { to: '/settings', icon: '⚙️', key: 'nav.settings' },
];

const MOBILE_ITEMS: NavItem[] = [
  { to: '/inbox', icon: '📥', key: 'nav.inbox' },
  { to: '/timeline', icon: '📅', key: 'nav.timeline' },
  { to: '/labs', icon: '🧪', key: 'nav.labs' },
  { to: '/meds', icon: '💊', key: 'nav.meds' },
  { to: '/prevention', icon: '🛡️', key: 'nav.prevention' },
  { to: '/ask', icon: '💬', key: 'nav.ask' },
];

function SidebarLink({ item, t }: { item: NavItem; t: (k: string) => string }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <span className="text-base">{item.icon}</span>
      <span>{t(item.key)}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();

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
          {TOP_ITEMS.map((item) => <SidebarLink key={item.to} item={item} t={t} />)}

          {NAV_GROUPS.map((group) => {
            const containsActive = group.items.some(i => location.pathname.startsWith(i.to));
            return (
              <details key={group.key} open={containsActive} className="group">
                <summary className="cursor-pointer select-none px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 list-none flex items-center justify-between">
                  <span>{t(group.key)}</span>
                  <span className="text-slate-600 group-open:rotate-90 transition-transform">›</span>
                </summary>
                <div className="space-y-0.5">
                  {group.items.map((item) => <SidebarLink key={item.to} item={item} t={t} />)}
                </div>
              </details>
            );
          })}

          <div className="pt-3 border-t border-slate-800 mt-3 space-y-0.5">
            {BOTTOM_ITEMS.map((item) => <SidebarLink key={item.to} item={item} t={t} />)}
          </div>
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
          {MOBILE_ITEMS.map((item) => (
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
