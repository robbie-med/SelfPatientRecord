import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMedAdminLog, createMedAdminLog, deleteMedAdminLog,
  type MedAdminLogEntry,
} from '../api/client';

const defaultForm = () => ({
  medication_name: '',
  administered_at: new Date().toISOString().slice(0, 16),
  dose_given: '',
  route: '',
  note: '',
});

export default function MedAdminLog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['med-admin-log'], queryFn: getMedAdminLog });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const createMut = useMutation({
    mutationFn: (f: ReturnType<typeof defaultForm>) => createMedAdminLog({
      medication_name: f.medication_name,
      administered_at: new Date(f.administered_at).toISOString(),
      dose_given: f.dose_given || null,
      route: f.route || null,
      note: f.note || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['med-admin-log'] }); setShowForm(false); setForm(defaultForm()); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteMedAdminLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['med-admin-log'] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.medAdmin.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.medAdmin.description')}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + {t('pages.medAdmin.add')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.medAdmin.medication')}</label>
              <input value={form.medication_name} onChange={e => setForm(p => ({ ...p, medication_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.medAdmin.administeredAt')}</label>
              <input type="datetime-local" value={form.administered_at} onChange={e => setForm(p => ({ ...p, administered_at: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.medAdmin.doseGiven')}</label>
              <input value={form.dose_given} onChange={e => setForm(p => ({ ...p, dose_given: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.medAdmin.route')}</label>
              <input value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.medAdmin.note')}</label>
              <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate(form)} disabled={!form.medication_name || !form.administered_at || createMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
      <div className="space-y-2">
        {data.map((e: MedAdminLogEntry) => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{e.medication_name}</div>
              <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{new Date(e.administered_at).toLocaleString()}</span>
                {e.dose_given && <span>{e.dose_given}</span>}
                {e.route && <span>{e.route}</span>}
              </div>
              {e.note && <div className="text-xs text-gray-400 mt-1">{e.note}</div>}
            </div>
            <button onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(e.id); }} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
