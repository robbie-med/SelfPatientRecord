import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getIllnessEpisodes, createIllnessEpisode, deleteIllnessEpisode,
  type IllnessEpisode,
} from '../api/client';

const EMPTY = { title: '', symptoms: '', onset_date: '', end_date: '', severity: '', treatments: '', outcome: '', notes: '' };

export default function Illness() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['illness-episodes'], queryFn: getIllnessEpisodes });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const createMut = useMutation({
    mutationFn: (f: typeof EMPTY) => createIllnessEpisode({
      title: f.title,
      symptoms_json: f.symptoms ? f.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
      onset_date: f.onset_date || null,
      end_date: f.end_date || null,
      severity: f.severity || null,
      treatments: f.treatments || null,
      outcome: f.outcome || null,
      notes: f.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['illness-episodes'] }); setShowForm(false); setForm(EMPTY); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteIllnessEpisode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['illness-episodes'] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.illness.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.illness.description')}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + {t('pages.illness.add')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.titleField')}</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.symptoms')}</label>
              <input value={form.symptoms} onChange={e => setForm(p => ({ ...p, symptoms: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.onsetDate')}</label>
              <input type="date" value={form.onset_date} onChange={e => setForm(p => ({ ...p, onset_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.endDate')}</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.severity')}</label>
              <input value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.outcome')}</label>
              <input value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.illness.treatments')}</label>
              <input value={form.treatments} onChange={e => setForm(p => ({ ...p, treatments: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate(form)} disabled={!form.title || createMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
      <div className="space-y-2">
        {data.map((e: IllnessEpisode) => {
          let symptoms: string[] = [];
          try { const parsed = JSON.parse(e.symptoms_json ?? '[]'); if (Array.isArray(parsed)) symptoms = parsed.map(String); } catch { /* noop */ }
          return (
            <div key={e.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{e.title}</div>
                {symptoms.length > 0 && <div className="text-sm text-gray-600 mt-1">{symptoms.join(', ')}</div>}
                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
                  {e.onset_date && <span>{t('pages.illness.onsetDate')}: {e.onset_date}</span>}
                  {e.end_date && <span>{t('pages.illness.endDate')}: {e.end_date}</span>}
                  {e.severity && <span>{e.severity}</span>}
                </div>
                {e.outcome && <div className="text-xs text-gray-400 mt-1">{t('pages.illness.outcome')}: {e.outcome}</div>}
              </div>
              <button onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(e.id); }} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
