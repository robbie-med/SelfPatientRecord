import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLabs, createLab, getLabHistory, getVitals, createVital, type Lab, type Vital } from '../api/client';
import LabChart from '../components/LabChart';
import VitalsChart from '../components/VitalsChart';
import LabExplainer from '../components/LabExplainer';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

const VITAL_TYPES = [
  { id: 'blood_pressure', unit: 'mmHg', placeholder: '120/80' },
  { id: 'heart_rate', unit: 'bpm', placeholder: '72' },
  { id: 'weight', unit: 'kg', placeholder: '70.0' },
  { id: 'spo2', unit: '%', placeholder: '98' },
  { id: 'temperature', unit: '°C', placeholder: '37.0' },
];

const INTERP_COLORS: Record<string, string> = {
  normal: 'text-green-700 bg-green-50',
  low: 'text-blue-700 bg-blue-50',
  high: 'text-red-700 bg-red-50',
  critical_low: 'text-red-900 bg-red-100 font-bold',
  critical_high: 'text-red-900 bg-red-100 font-bold',
};

function InterpBadge({ interp }: { interp?: string }) {
  const { t } = useTranslation();
  if (!interp) return null;
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full', INTERP_COLORS[interp] ?? 'text-gray-600 bg-gray-100')}>
      {t(`labs.interpretation.${interp}` as Parameters<typeof t>[0]) || interp}
    </span>
  );
}

export default function Labs() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'labs' | 'vitals'>('labs');

  // Labs state
  const { data: labs = [], isLoading: labsLoading } = useQuery({ queryKey: ['labs'], queryFn: () => getLabs() });
  const [selectedTest, setSelectedTest] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);
  const [showAddLabForm, setShowAddLabForm] = useState(false);
  const [labForm, setLabForm] = useState({ test_name: '', value: '', unit: '', collection_date: '', panel: '', reference_range_low: '', reference_range_high: '' });

  const { data: chartData = [] } = useQuery({
    queryKey: ['lab-history', selectedTest],
    queryFn: () => getLabHistory(selectedTest),
    enabled: !!selectedTest,
  });

  const createLabMut = useMutation({
    mutationFn: createLab,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labs'] });
      setShowAddLabForm(false);
      setLabForm({ test_name: '', value: '', unit: '', collection_date: '', panel: '', reference_range_low: '', reference_range_high: '' });
    },
  });

  // Vitals state
  const { data: vitals = [], isLoading: vitalsLoading } = useQuery({ queryKey: ['vitals'], queryFn: () => getVitals() });
  const [selectedVitalType, setSelectedVitalType] = useState('');
  const [showAddVitalForm, setShowAddVitalForm] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    vital_type: 'blood_pressure',
    value: '',
    unit: 'mmHg',
    recorded_at: new Date().toISOString().slice(0, 16),
    context: '',
  });

  const createVitalMut = useMutation({
    mutationFn: createVital,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vitals'] });
      setShowAddVitalForm(false);
      setVitalForm({ vital_type: 'blood_pressure', value: '', unit: 'mmHg', recorded_at: new Date().toISOString().slice(0, 16), context: '' });
    },
  });

  const handleVitalTypeChange = (typeId: string) => {
    const cfg = VITAL_TYPES.find(v => v.id === typeId);
    setVitalForm(f => ({ ...f, vital_type: typeId, unit: cfg?.unit ?? '', value: '' }));
  };

  const handleAddLab = () => {
    if (!labForm.test_name || !labForm.value || !labForm.collection_date) return;
    createLabMut.mutate({
      test_name: labForm.test_name,
      value: labForm.value,
      unit: labForm.unit || undefined,
      collection_date: labForm.collection_date,
      panel: labForm.panel || undefined,
      reference_range_low: labForm.reference_range_low ? parseFloat(labForm.reference_range_low) : undefined,
      reference_range_high: labForm.reference_range_high ? parseFloat(labForm.reference_range_high) : undefined,
      user_confirmed: true,
    });
  };

  const handleAddVital = () => {
    if (!vitalForm.value || !vitalForm.recorded_at) return;
    createVitalMut.mutate({
      vital_type: vitalForm.vital_type,
      value: vitalForm.value,
      unit: vitalForm.unit || undefined,
      recorded_at: new Date(vitalForm.recorded_at).toISOString(),
      context: vitalForm.context || undefined,
      user_confirmed: true,
    });
  };

  const uniqueTests = [...new Set(labs.map(l => l.test_name))].sort();
  const uniqueVitalTypes = [...new Set(vitals.map(v => v.vital_type))].sort();
  const vitalsForChart = vitals.filter(v => v.vital_type === selectedVitalType);

  const grouped = labs.reduce<Record<string, Lab[]>>((acc, l) => {
    const key = l.panel || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const groupedVitals = vitals.reduce<Record<string, Vital[]>>((acc, v) => {
    if (!acc[v.vital_type]) acc[v.vital_type] = [];
    acc[v.vital_type].push(v);
    return acc;
  }, {});

  const formatDate = (d: string) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; } };
  const formatDateTime = (d: string) => { try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return d; } };

  const vitalTypeName = (id: string) => {
    const key = `labs.vitalTypes.${id}` as Parameters<typeof t>[0];
    return t(key) || id;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('labs.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('labs.description')}</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'labs' && (
            <button onClick={() => setShowAddLabForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
              {t('labs.addLab')}
            </button>
          )}
          {activeTab === 'vitals' && (
            <button onClick={() => setShowAddVitalForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
              {t('labs.addVital')}
            </button>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('labs')}
          className={clsx('px-4 py-1.5 text-sm rounded-md transition-colors', activeTab === 'labs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
        >
          {t('labs.labsTab')}
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={clsx('px-4 py-1.5 text-sm rounded-md transition-colors', activeTab === 'vitals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
        >
          {t('labs.vitalsTab')}
        </button>
      </div>

      {/* ── Labs tab ──────────────────────────────────────────────────── */}
      {activeTab === 'labs' && (
        <>
          {showAddLabForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">{t('labs.addLab')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'test_name', label: t('labs.testName'), type: 'text' },
                  { key: 'value', label: t('labs.value'), type: 'text' },
                  { key: 'unit', label: t('labs.unit'), type: 'text' },
                  { key: 'collection_date', label: t('labs.collectionDate'), type: 'date' },
                  { key: 'panel', label: t('labs.panel'), type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      value={(labForm as Record<string, string>)[f.key]}
                      onChange={e => setLabForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('labs.referenceRange')} (low / high)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Low" value={labForm.reference_range_low} onChange={e => setLabForm(p => ({ ...p, reference_range_low: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="High" value={labForm.reference_range_high} onChange={e => setLabForm(p => ({ ...p, reference_range_high: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddLab} disabled={createLabMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
                <button onClick={() => setShowAddLabForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{t('common.cancel')}</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('labs.selectTest')}</label>
              <select
                value={selectedTest}
                onChange={e => { setSelectedTest(e.target.value); setShowExplainer(false); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— {t('labs.selectTest')} —</option>
                {uniqueTests.map(test => <option key={test} value={test}>{test}</option>)}
              </select>
            </div>
            {selectedTest && <LabChart data={chartData} testName={selectedTest} />}
            {selectedTest && (
              <div className="mt-3">
                <button onClick={() => setShowExplainer(v => !v)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  {showExplainer ? '▲ Hide' : '▼ What does this test measure?'}
                </button>
                {showExplainer && <LabExplainer testName={selectedTest} />}
              </div>
            )}
          </div>

          <div>
            {labsLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
            {!labsLoading && !labs.length && <p className="text-sm text-gray-400 text-center py-8">{t('labs.noLabs')}</p>}
            {Object.entries(grouped).sort().map(([panel, rows]) => (
              <div key={panel} className="mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{panel}</div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500">
                        <th className="text-left px-4 py-2 font-medium">{t('labs.testName')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('labs.value')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('labs.referenceRange')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('common.date')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((lab: Lab) => (
                        <tr key={lab.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{lab.test_name}</td>
                          <td className={clsx('px-4 py-2.5', lab.interpretation && lab.interpretation !== 'normal' ? 'text-red-700 font-semibold' : 'text-gray-700')}>
                            {lab.value}{lab.unit ? ` ${lab.unit}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {lab.reference_range_low != null && lab.reference_range_high != null
                              ? `${lab.reference_range_low} – ${lab.reference_range_high}`
                              : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">{formatDate(lab.collection_date)}</td>
                          <td className="px-4 py-2.5"><InterpBadge interp={lab.interpretation ?? undefined} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Vitals tab ────────────────────────────────────────────────── */}
      {activeTab === 'vitals' && (
        <>
          {showAddVitalForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">{t('labs.addVital')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('labs.vitalType')}</label>
                  <select
                    value={vitalForm.vital_type}
                    onChange={e => handleVitalTypeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VITAL_TYPES.map(v => (
                      <option key={v.id} value={v.id}>{vitalTypeName(v.id)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('labs.vitalValue')} {vitalForm.unit && <span className="text-gray-400">({vitalForm.unit})</span>}
                  </label>
                  <input
                    type="text"
                    value={vitalForm.value}
                    placeholder={VITAL_TYPES.find(v => v.id === vitalForm.vital_type)?.placeholder ?? ''}
                    onChange={e => setVitalForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('labs.vitalDate')}</label>
                  <input
                    type="datetime-local"
                    value={vitalForm.recorded_at}
                    onChange={e => setVitalForm(f => ({ ...f, recorded_at: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('labs.vitalContext')} <span className="text-gray-400">({t('common.optional')})</span></label>
                  <input
                    type="text"
                    value={vitalForm.context}
                    placeholder="e.g. resting, after exercise"
                    onChange={e => setVitalForm(f => ({ ...f, context: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddVital} disabled={createVitalMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
                <button onClick={() => setShowAddVitalForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{t('common.cancel')}</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('labs.selectVitalType')}</label>
              <select
                value={selectedVitalType}
                onChange={e => setSelectedVitalType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— {t('labs.selectVitalType')} —</option>
                {uniqueVitalTypes.map(type => <option key={type} value={type}>{vitalTypeName(type)}</option>)}
              </select>
            </div>
            {selectedVitalType && <VitalsChart data={vitalsForChart} vitalType={selectedVitalType} />}
          </div>

          <div>
            {vitalsLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
            {!vitalsLoading && !vitals.length && <p className="text-sm text-gray-400 text-center py-8">{t('labs.noVitals')}</p>}
            {Object.entries(groupedVitals).sort().map(([type, rows]) => (
              <div key={type} className="mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{vitalTypeName(type)}</div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500">
                        <th className="text-left px-4 py-2 font-medium">{t('labs.vitalValue')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('labs.vitalDate')}</th>
                        <th className="text-left px-4 py-2 font-medium">{t('labs.vitalContext')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((vital: Vital) => (
                        <tr key={vital.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-semibold text-gray-900">
                            {vital.value}{vital.unit ? ` ${vital.unit}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">{formatDateTime(vital.recorded_at)}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{vital.context ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
