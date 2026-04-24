import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usePatient, useUpdatePatient } from '../hooks/usePatient';
import { getHealth, getModules, enableModule, disableModule } from '../api/client';
import clsx from 'clsx';

const COUNTRIES = [
  { code: 'US', label: 'United States' }, { code: 'KR', label: 'South Korea' },
  { code: 'JP', label: 'Japan' }, { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' }, { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' }, { code: 'ES', label: 'Spain' },
  { code: 'BR', label: 'Brazil' }, { code: 'MX', label: 'Mexico' },
  { code: 'TR', label: 'Turkey' }, { code: 'CN', label: 'China' },
  { code: 'RU', label: 'Russia' },
];

const COMPARISON_COUNTRIES = ['KR', 'JP', 'CA', 'GB', 'DE', 'FR', 'ES'];

const ORGS = [
  { id: 'uspstf', label: 'USPSTF' }, { id: 'cdc', label: 'CDC' },
  { id: 'ada', label: 'ADA' }, { id: 'acog', label: 'ACOG' },
  { id: 'aha_acc', label: 'AHA/ACC' }, { id: 'kdca', label: 'KDCA' },
  { id: 'kda', label: 'Korean Diabetes Association' }, { id: 'nhis_kr', label: 'Korea NHIS' },
];

type Section = 'profile' | 'guidelines' | 'ai' | 'modules' | 'data';

export default function Settings() {
  const { t } = useTranslation();
  const { data: patient } = usePatient();
  const updatePatient = useUpdatePatient();
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: getModules });

  const [section, setSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);

  // Profile form state
  const [form, setForm] = useState({
    legal_name: '', preferred_name: '', date_of_birth: '',
    sex_at_birth: 'unknown', country_of_birth: 'US', current_country: 'US',
    preferred_language: 'en', preferred_units: 'metric',
  });

  // Guideline lens state
  const [lens, setLens] = useState({
    default_country: 'US', comparison_countries: [] as string[],
    preferred_organizations: ['uspstf', 'cdc', 'ada', 'acog'],
    show_foreign_guidelines: false,
  });

  useEffect(() => {
    if (patient) {
      setForm({
        legal_name: patient.legal_name ?? '',
        preferred_name: patient.preferred_name ?? '',
        date_of_birth: patient.date_of_birth ?? '',
        sex_at_birth: patient.sex_at_birth ?? 'unknown',
        country_of_birth: patient.country_of_birth ?? 'US',
        current_country: patient.current_country ?? 'US',
        preferred_language: patient.preferred_language ?? 'en',
        preferred_units: patient.preferred_units ?? 'metric',
      });
      if (patient.guideline_lens) {
        setLens(l => ({ ...l, ...patient.guideline_lens }));
      }
    }
  }, [patient]);

  const handleSaveProfile = () => {
    updatePatient.mutate({ ...form, guideline_lens: { ...lens, display_language: form.preferred_language, export_language: form.preferred_language } }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const toggleOrg = (id: string) => {
    setLens(l => ({ ...l, preferred_organizations: l.preferred_organizations.includes(id) ? l.preferred_organizations.filter(o => o !== id) : [...l.preferred_organizations, id] }));
  };

  const toggleComparison = (code: string) => {
    setLens(l => ({ ...l, comparison_countries: l.comparison_countries.includes(code) ? l.comparison_countries.filter(c => c !== code) : [...l.comparison_countries, code] }));
  };

  const SECTIONS: { key: Section; label: string }[] = [
    { key: 'profile', label: t('settings.profile') },
    { key: 'guidelines', label: t('settings.guidelines') },
    { key: 'ai', label: t('settings.ai') },
    { key: 'modules', label: t('modules.title') },
    { key: 'data', label: t('settings.data') },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.title')}</h1>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} className={clsx('px-3 py-1.5 text-sm rounded-md transition-colors', section === s.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {section === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'legal_name', label: t('settings.fields.legalName'), type: 'text' },
              { key: 'preferred_name', label: t('settings.fields.preferredName'), type: 'text' },
              { key: 'date_of_birth', label: t('settings.fields.dob'), type: 'date' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.fields.sexAtBirth')}</label>
              <select value={form.sex_at_birth} onChange={e => setForm(p => ({ ...p, sex_at_birth: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(['male', 'female', 'intersex', 'unknown'] as const).map(s => <option key={s} value={s}>{t(`settings.sex.${s}`)}</option>)}
              </select>
            </div>
            {(['country_of_birth', 'current_country'] as const).map(key => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t(`settings.fields.${key === 'country_of_birth' ? 'countryOfBirth' : 'currentCountry'}`)}</label>
                <select value={(form as Record<string, string>)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.fields.language')}</label>
              <select value={form.preferred_language} onChange={e => setForm(p => ({ ...p, preferred_language: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="en">English</option>
                <option value="ko">한국어 (Korean)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.fields.units')}</label>
              <select value={form.preferred_units} onChange={e => setForm(p => ({ ...p, preferred_units: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="metric">{t('settings.units.metric')}</option>
                <option value="imperial">{t('settings.units.imperial')}</option>
              </select>
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={updatePatient.isPending} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
            {saved ? `✓ ${t('settings.saved')}` : t('common.save')}
          </button>
        </div>
      )}

      {/* Guidelines */}
      {section === 'guidelines' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.defaultCountry')}</label>
            <select value={lens.default_country} onChange={e => setLens(l => ({ ...l, default_country: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.comparisonCountries')}</label>
            <div className="flex flex-wrap gap-2">
              {COMPARISON_COUNTRIES.map(code => {
                const country = COUNTRIES.find(c => c.code === code);
                const active = lens.comparison_countries.includes(code);
                return (
                  <button key={code} onClick={() => toggleComparison(code)} className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors', active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400')}>
                    {country?.label ?? code}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred organizations</label>
            <div className="flex flex-wrap gap-2">
              {ORGS.map(org => {
                const active = lens.preferred_organizations.includes(org.id);
                return (
                  <button key={org.id} onClick={() => toggleOrg(org.id)} className={clsx('text-xs px-3 py-1.5 rounded-full border transition-colors', active ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-300 hover:border-slate-400')}>
                    {org.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={updatePatient.isPending} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">
            {saved ? `✓ ${t('settings.saved')}` : t('common.save')}
          </button>
        </div>
      )}

      {/* AI */}
      {section === 'ai' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span>⚠️</span>
            <p className="text-xs text-amber-800">{t('settings.aiWarning')}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('settings.aiEnabled')}</span>
            <div className={clsx('text-xs px-2 py-1 rounded-full', health?.ai_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
              {health?.ai_enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <p className="text-xs text-gray-500">AI features are controlled via environment variables. Set <code className="bg-gray-100 px-1 rounded">AI_ENABLED=true</code> and <code className="bg-gray-100 px-1 rounded">AI_API_KEY</code> in your <code className="bg-gray-100 px-1 rounded">.env</code> file and restart the server.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.aiUrl')}</label>
            <p className="text-xs text-gray-400">Set via <code className="bg-gray-100 px-1 rounded">AI_BASE_URL</code> in .env (default: OpenAI). Point to Maple Proxy for enhanced privacy.</p>
          </div>
        </div>
      )}

      {/* Modules */}
      {section === 'modules' && (
        <div className="space-y-3">
          {['suggested', 'on', 'off'].map(statusFilter => {
            const filtered = modules.filter(m => m.status === statusFilter);
            if (!filtered.length) return null;
            const label = statusFilter === 'suggested' ? t('modules.suggested') : statusFilter === 'on' ? t('modules.active') : t('modules.available');
            return (
              <div key={statusFilter}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
                <div className="space-y-2">
                  {filtered.map(m => (
                    <div key={m.id} className={clsx('bg-white border rounded-lg px-4 py-3 flex items-center gap-3', m.status === 'suggested' ? 'border-blue-200' : 'border-gray-200')}>
                      <span className="text-xl">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.trigger_reason ?? m.description}</div>
                      </div>
                      <button
                        onClick={() => m.status === 'on' ? disableModule(m.id) : enableModule(m.id)}
                        className={clsx('text-xs px-3 py-1.5 rounded-lg shrink-0', m.status === 'on' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700')}
                      >
                        {m.status === 'on' ? t('modules.disable') : t('modules.enable')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data */}
      {section === 'data' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">{t('settings.exportAll')}</h3>
            <p className="text-xs text-gray-500 mb-2">Downloads your complete health record as JSON.</p>
            <button className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              📦 Export JSON
            </button>
          </div>
          <hr className="border-gray-100" />
          <div>
            <h3 className="text-sm font-medium text-red-600 mb-1">{t('settings.deleteAll')}</h3>
            <p className="text-xs text-gray-500 mb-2">Permanently deletes all your health data. This cannot be undone.</p>
            <button
              onClick={() => { if (confirm(t('settings.deleteConfirm'))) alert('Delete not implemented in MVP.'); }}
              className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100"
            >
              🗑️ {t('settings.deleteAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
