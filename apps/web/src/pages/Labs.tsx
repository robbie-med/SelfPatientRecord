import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLabs, createLab, getLabHistory, type Lab } from '../api/client';
import LabChart from '../components/LabChart';
import LabExplainer from '../components/LabExplainer';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

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

  const { data: labs = [], isLoading } = useQuery({ queryKey: ['labs'], queryFn: () => getLabs() });

  const [selectedTest, setSelectedTest] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ test_name: '', value: '', unit: '', collection_date: '', panel: '', reference_range_low: '', reference_range_high: '' });

  const { data: chartData = [] } = useQuery({
    queryKey: ['lab-history', selectedTest],
    queryFn: () => getLabHistory(selectedTest),
    enabled: !!selectedTest,
  });

  const createMut = useMutation({
    mutationFn: createLab,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labs'] }); setShowAddForm(false); setForm({ test_name: '', value: '', unit: '', collection_date: '', panel: '', reference_range_low: '', reference_range_high: '' }); },
  });

  const uniqueTests = [...new Set(labs.map(l => l.test_name))].sort();

  const grouped = labs.reduce<Record<string, Lab[]>>((acc, l) => {
    const key = l.panel || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const handleAdd = () => {
    if (!form.test_name || !form.value || !form.collection_date) return;
    createMut.mutate({
      test_name: form.test_name,
      value: form.value,
      unit: form.unit || undefined,
      collection_date: form.collection_date,
      panel: form.panel || undefined,
      reference_range_low: form.reference_range_low ? parseFloat(form.reference_range_low) : undefined,
      reference_range_high: form.reference_range_high ? parseFloat(form.reference_range_high) : undefined,
      user_confirmed: true,
    });
  };

  const formatDate = (d: string) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; } };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('labs.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('labs.description')}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          {t('labs.addLab')}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">{t('labs.addLab')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'test_name', label: t('labs.testName'), type: 'text', required: true },
              { key: 'value', label: t('labs.value'), type: 'text', required: true },
              { key: 'unit', label: t('labs.unit'), type: 'text', required: false },
              { key: 'collection_date', label: t('labs.collectionDate'), type: 'date', required: true },
              { key: 'panel', label: t('labs.panel'), type: 'text', required: false },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('labs.referenceRange')} (low / high)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Low" value={form.reference_range_low} onChange={e => setForm(p => ({ ...p, reference_range_low: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" placeholder="High" value={form.reference_range_high} onChange={e => setForm(p => ({ ...p, reference_range_high: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={createMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Chart */}
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
            <button
              onClick={() => setShowExplainer(v => !v)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              {showExplainer ? '▲ Hide' : '▼ What does this test measure?'}
            </button>
            {showExplainer && <LabExplainer testName={selectedTest} />}
          </div>
        )}
      </div>

      {/* Table */}
      <div>
        {isLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
        {!isLoading && !labs.length && <p className="text-sm text-gray-400 text-center py-8">{t('labs.noLabs')}</p>}
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
    </div>
  );
}
