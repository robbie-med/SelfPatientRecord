import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePatient, useUpdatePatient } from '../hooks/usePatient';
import { getHealth, getModules, enableModule, disableModule, getAIConfig, updateAIConfig, AIConfigUpdate, getVisitPrepExport, getHandoffExport, type VisitPrepExport, type HandoffExport } from '../api/client';
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

const PROVIDERS = [
  { id: 'ppq', label: 'PPQ.AI', baseUrl: 'https://api.ppq.ai/v1' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'maple', label: 'Maple Proxy (local)', baseUrl: 'http://localhost:8080/v1' },
  { id: 'custom', label: 'Custom', baseUrl: '' },
];

const MODELS_BY_PROVIDER: Record<string, Array<{ id: string; label: string }>> = {
  ppq: [
    { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku — recommended' },
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite — budget' },
    { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat v3.1 — budget' },
    { id: 'private/gpt-oss-120b', label: 'GPT-OSS 120B — TEE private' },
    { id: 'private/deepseek-r1-0528', label: 'DeepSeek R1 — TEE private, reasoning' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini — recommended' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  maple: [
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku — recommended' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5' },
  ],
  custom: [],
};

function printHtml(html: string) {
  const win = window.open('', '_blank', 'width=820,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function visitPrepHtml(data: VisitPrepExport): string {
  const name = data.patient.preferred_name || data.patient.legal_name;
  const dob = data.patient.date_of_birth ?? 'Unknown';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const section = (title: string, items: string[], empty: string) =>
    `<h2>${title}</h2>${items.length
      ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`
      : `<p class="empty">${empty}</p>`}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Visit Prep — ${name}</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#111;font-size:14px;line-height:1.6}
h1{font-size:20px;margin-bottom:4px}.meta{color:#555;font-size:13px;margin-bottom:24px}
h2{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px;margin-bottom:8px}
ul{margin:0;padding-left:20px}li{margin-bottom:4px}.empty{color:#888;font-style:italic}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#999}
@media print{body{margin:20px}}</style></head><body>
<h1>Visit Preparation Summary</h1>
<p class="meta">${name} · DOB: ${dob} · ${data.patient.sex_at_birth} · ${date}</p>
${section('Active Conditions',
    data.conditions.map(c => `${c.name}${c.onset_date ? ` (since ${c.onset_date})` : ''}`),
    'No active conditions recorded.')}
${section('Current Medications',
    data.medications.map(m => [m.name, m.dose, m.frequency, m.indication ? `for ${m.indication}` : ''].filter(Boolean).join(' — ')),
    'No current medications recorded.')}
${section('Allergies',
    data.allergies.map(a => `${a.allergen}${a.reaction ? ` → ${a.reaction}` : ''}${a.severity ? ` (${a.severity})` : ''}`),
    'No allergies recorded.')}
${section('Recent Abnormal Labs (last 6 months)',
    data.abnormal_labs.map(l => `${l.test_name}: <strong>${l.value}${l.unit ? ' ' + l.unit : ''}</strong> (${l.interpretation}) — ${l.collection_date}`),
    'No recent abnormal labs.')}
${section('Open Care Gaps',
    data.care_gaps.map(g => `${g.title} [${g.urgency}]`),
    'No open care gaps.')}
<p class="footer">Generated from HealthBinder personal health record. May be incomplete. Not a substitute for clinical records.</p>
</body></html>`;
}

function handoffHtml(data: HandoffExport): string {
  const name = data.patient.preferred_name || data.patient.legal_name;
  const dob = data.patient.date_of_birth ?? 'Unknown';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const section = (title: string, items: string[], empty: string) =>
    `<h2>${title}</h2>${items.length
      ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`
      : `<p class="empty">${empty}</p>`}`;

  const condByStatus = (status: string) =>
    data.conditions.filter(c => c.status === status).map(c => `${c.name}${c.onset_date ? ` (since ${c.onset_date})` : ''}`);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Physician Handoff — ${name}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;font-size:13px;line-height:1.6}
h1{font-size:20px;margin-bottom:4px}.meta{color:#555;font-size:12px;margin-bottom:24px}
h2{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #ddd;padding-bottom:3px;margin-top:18px;margin-bottom:6px}
ul{margin:0;padding-left:20px}li{margin-bottom:3px}.empty{color:#888;font-style:italic}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#999}
@media print{body{margin:20px}}</style></head><body>
<h1>Physician Handoff Summary</h1>
<p class="meta">${name} · DOB: ${dob} · ${data.patient.sex_at_birth} · Current country: ${data.patient.current_country} · Generated: ${date}</p>
${section('Active Conditions', condByStatus('active'), 'None.')}
${section('Historical / Resolved Conditions', [...condByStatus('resolved'), ...condByStatus('historical')], 'None.')}
${section('Current Medications',
    data.medications.filter(m => m.status === 'current').map(m => [m.name, m.generic_name ? `(${m.generic_name})` : '', m.dose, m.route, m.frequency, m.indication ? `for ${m.indication}` : ''].filter(Boolean).join(' ')),
    'None.')}
${section('Prior Medications',
    data.medications.filter(m => m.status !== 'current').map(m => `${m.name}${m.end_date ? ` — stopped ${m.end_date}` : ''}`),
    'None.')}
${section('Allergies',
    data.allergies.map(a => `${a.allergen}${a.reaction ? ` → ${a.reaction}` : ''}${a.severity ? ` (${a.severity})` : ''}`),
    'None.')}
${section('Latest Lab Results',
    data.labs_latest.map(l => `${l.test_name}: ${l.value}${l.unit ? ' ' + l.unit : ''} — ${l.collection_date}${l.interpretation && l.interpretation !== 'normal' ? ` <strong>[${l.interpretation}]</strong>` : ''}`),
    'No labs recorded.')}
${section('Recent Vitals',
    data.vitals.map(v => `${v.vital_type.replace(/_/g, ' ')}: ${v.value}${v.unit ? ' ' + v.unit : ''} — ${v.recorded_at.slice(0, 10)}`),
    'No vitals recorded.')}
${section('Vaccines',
    data.vaccines.map(v => `${v.vaccine_name}${v.dose_number ? ` (dose ${v.dose_number})` : ''} — ${v.administered_date}`),
    'No vaccines recorded.')}
${section('Recent Encounters',
    data.encounters.map(e => `${e.encounter_date}: ${e.encounter_type.replace(/_/g, ' ')}${e.facility ? ` at ${e.facility}` : ''}${e.chief_complaint ? ` — ${e.chief_complaint}` : ''}`),
    'No encounters recorded.')}
${section('Open Care Gaps',
    data.care_gaps.map(g => `${g.title} [${g.urgency}]`),
    'None.')}
<p class="footer">Generated from HealthBinder personal health record on ${date}. May be incomplete. Verify against clinical records before clinical use.</p>
</body></html>`;
}

type Section = 'profile' | 'guidelines' | 'ai' | 'modules' | 'data';

export default function Settings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: patient } = usePatient();
  const updatePatient = useUpdatePatient();
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: getModules });
  const { data: aiConfigData } = useQuery({ queryKey: ['ai-config'], queryFn: getAIConfig });

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

  // AI config form state
  const [aiForm, setAiForm] = useState<AIConfigUpdate & { custom_extraction: boolean; custom_chat: boolean }>({
    enabled: false,
    provider: 'ppq',
    base_url: 'https://api.ppq.ai/v1',
    api_key: '',
    extraction_model: 'anthropic/claude-3.5-haiku',
    chat_model: 'anthropic/claude-3.5-haiku',
    custom_extraction: false,
    custom_chat: false,
  });
  const [aiSaved, setAiSaved] = useState(false);

  const saveAIConfig = useMutation({
    mutationFn: (data: AIConfigUpdate) => updateAIConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-config'] });
      qc.invalidateQueries({ queryKey: ['health'] });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2000);
    },
  });

  const toggleModule = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => on ? enableModule(id) : disableModule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] }),
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

  useEffect(() => {
    if (aiConfigData) {
      const knownModels = MODELS_BY_PROVIDER[aiConfigData.provider] ?? [];
      const exKnown = knownModels.some(m => m.id === aiConfigData.extraction_model);
      const chKnown = knownModels.some(m => m.id === aiConfigData.chat_model);
      setAiForm(f => ({
        ...f,
        enabled: aiConfigData.enabled,
        provider: aiConfigData.provider,
        base_url: aiConfigData.base_url,
        api_key: '',
        extraction_model: aiConfigData.extraction_model,
        chat_model: aiConfigData.chat_model,
        custom_extraction: !exKnown && knownModels.length > 0,
        custom_chat: !chKnown && knownModels.length > 0,
      }));
    }
  }, [aiConfigData]);

  const handleProviderChange = (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    const defaultModel = MODELS_BY_PROVIDER[providerId]?.[0]?.id ?? '';
    setAiForm(f => ({
      ...f,
      provider: providerId,
      base_url: providerId !== 'custom' ? (provider?.baseUrl ?? f.base_url) : f.base_url,
      extraction_model: defaultModel || f.extraction_model,
      chat_model: defaultModel || f.chat_model,
      custom_extraction: providerId === 'custom',
      custom_chat: providerId === 'custom',
    }));
  };

  const handlePrintVisitPrep = async () => {
    const data = await getVisitPrepExport();
    printHtml(visitPrepHtml(data));
  };

  const handlePrintHandoff = async () => {
    const data = await getHandoffExport();
    printHtml(handoffHtml(data));
  };

  const handleSaveProfile = () => {
    updatePatient.mutate({ ...form, guideline_lens: { ...lens, display_language: form.preferred_language, export_language: form.preferred_language } }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const handleSaveAI = () => {
    const { custom_extraction, custom_chat, ...payload } = aiForm;
    void custom_extraction; void custom_chat;
    saveAIConfig.mutate(payload.api_key ? payload : { ...payload, api_key: undefined });
  };

  const toggleOrg = (id: string) => {
    setLens(l => ({ ...l, preferred_organizations: l.preferred_organizations.includes(id) ? l.preferred_organizations.filter(o => o !== id) : [...l.preferred_organizations, id] }));
  };

  const toggleComparison = (code: string) => {
    setLens(l => ({ ...l, comparison_countries: l.comparison_countries.includes(code) ? l.comparison_countries.filter(c => c !== code) : [...l.comparison_countries, code] }));
  };

  const currentModels = MODELS_BY_PROVIDER[aiForm.provider] ?? [];
  const isCustomProvider = aiForm.provider === 'custom';

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
            <span className="shrink-0">⚠️</span>
            <p className="text-xs text-amber-800">{t('settings.aiWarning')}</p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{t('settings.aiEnabled')}</label>
            <button
              onClick={() => setAiForm(f => ({ ...f, enabled: !f.enabled }))}
              className={clsx('relative w-11 h-6 rounded-full transition-colors', aiForm.enabled ? 'bg-blue-600' : 'bg-gray-300')}
            >
              <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', aiForm.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.aiProvider')}</label>
            <select
              value={aiForm.provider}
              onChange={e => handleProviderChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.aiBaseUrl')}</label>
            <input
              type="text"
              value={aiForm.base_url}
              onChange={e => setAiForm(f => ({ ...f, base_url: e.target.value }))}
              disabled={!isCustomProvider}
              className={clsx('w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500', !isCustomProvider && 'bg-gray-50 text-gray-500')}
            />
          </div>

          {/* API key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">{t('settings.aiKey')}</label>
              {aiConfigData?.api_key_set && !aiForm.api_key && (
                <span className="text-xs text-green-600">✓ {t('settings.aiKeySet')}</span>
              )}
            </div>
            <input
              type="password"
              value={aiForm.api_key ?? ''}
              onChange={e => setAiForm(f => ({ ...f, api_key: e.target.value }))}
              placeholder={aiConfigData?.api_key_set ? t('settings.aiNewKeyPlaceholder') : t('settings.aiKeyPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
            />
          </div>

          {/* Extraction model */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.aiExtractionModel')}</label>
            {(isCustomProvider || aiForm.custom_extraction) ? (
              <input
                type="text"
                value={aiForm.extraction_model}
                onChange={e => setAiForm(f => ({ ...f, extraction_model: e.target.value }))}
                placeholder="e.g. anthropic/claude-3.5-haiku"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="flex gap-2">
                <select
                  value={currentModels.some(m => m.id === aiForm.extraction_model) ? aiForm.extraction_model : '__custom__'}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setAiForm(f => ({ ...f, custom_extraction: true, extraction_model: '' }));
                    } else {
                      setAiForm(f => ({ ...f, extraction_model: e.target.value }));
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currentModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  <option value="__custom__">Other (enter model ID)…</option>
                </select>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">{t('settings.aiExtractionModelHint')}</p>
          </div>

          {/* Chat model */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('settings.aiChatModel')}</label>
            {(isCustomProvider || aiForm.custom_chat) ? (
              <input
                type="text"
                value={aiForm.chat_model}
                onChange={e => setAiForm(f => ({ ...f, chat_model: e.target.value }))}
                placeholder="e.g. anthropic/claude-3.5-haiku"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                value={currentModels.some(m => m.id === aiForm.chat_model) ? aiForm.chat_model : '__custom__'}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setAiForm(f => ({ ...f, custom_chat: true, chat_model: '' }));
                  } else {
                    setAiForm(f => ({ ...f, chat_model: e.target.value }));
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currentModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                <option value="__custom__">Other (enter model ID)…</option>
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">{t('settings.aiChatModelHint')}</p>
          </div>

          {/* TEE note when private model selected */}
          {(aiForm.extraction_model.startsWith('private/') || aiForm.chat_model.startsWith('private/')) && (
            <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="shrink-0">🔒</span>
              <p className="text-xs text-green-800">{t('settings.aiTeeNote')}</p>
            </div>
          )}

          {/* Current status */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Current status:</span>
            <span className={clsx('px-2 py-0.5 rounded-full', health?.ai_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
              {health?.ai_enabled ? 'Active' : 'Inactive'}
            </span>
            {health?.ai_enabled && <span className="text-gray-400">(changes take effect immediately)</span>}
          </div>

          <button
            onClick={handleSaveAI}
            disabled={saveAIConfig.isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {aiSaved ? `✓ ${t('settings.saved')}` : t('common.save')}
          </button>
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
                        onClick={() => toggleModule.mutate({ id: m.id, on: m.status !== 'on' })}
                        disabled={toggleModule.isPending}
                        className={clsx('text-xs px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50', m.status === 'on' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700')}
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
            <h3 className="text-sm font-medium text-gray-700 mb-1">{t('settings.exportVisitPrep')}</h3>
            <p className="text-xs text-gray-500 mb-2">Active conditions, current meds, allergies, recent abnormal labs, and open care gaps — formatted for your next appointment.</p>
            <button onClick={handlePrintVisitPrep} className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              🖨️ Print visit prep
            </button>
          </div>
          <hr className="border-gray-100" />
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">{t('settings.exportHandoff')}</h3>
            <p className="text-xs text-gray-500 mb-2">Full problem list, all medications, labs, vitals, vaccines, and encounters — for sharing with a new provider.</p>
            <button onClick={handlePrintHandoff} className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              🖨️ Print handoff summary
            </button>
          </div>
          <hr className="border-gray-100" />
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
