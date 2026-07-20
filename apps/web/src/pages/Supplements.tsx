import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSupplements, createSupplement, deleteSupplement,
  type Supplement,
} from '../api/client';

const EMPTY = { name: '', dose: '', unit: '', frequency: '', brand: '', reason: '' };

export default function Supplements() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['supplements'], queryFn: getSupplements });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const createMut = useMutation({
    mutationFn: createSupplement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplements'] }); setShowForm(false); setForm(EMPTY); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteSupplement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplements'] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.supplements.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.supplements.description')}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + {t('pages.supplements.add')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name', label: t('pages.supplements.name') },
              { key: 'dose', label: t('pages.supplements.dose') },
              { key: 'unit', label: t('pages.supplements.unit') },
              { key: 'frequency', label: t('pages.supplements.frequency') },
              { key: 'brand', label: t('pages.supplements.brand') },
              { key: 'reason', label: t('pages.supplements.reason') },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate(form)}
              disabled={!form.name || createMut.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {t('common.save')}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
      <div className="space-y-2">
        {data.map((s: Supplement) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{s.name}</div>
              <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {s.dose && <span>{s.dose}{s.unit ? ' ' + s.unit : ''}</span>}
                {s.frequency && <span>{s.frequency}</span>}
                {s.brand && <span className="text-gray-400">{s.brand}</span>}
              </div>
              {s.reason && <div className="text-xs text-gray-400 mt-1">For: {s.reason}</div>}
            </div>
            <button
              onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(s.id); }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
