import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getImaging, createImaging, type ImagingReport } from '../api/client';
import ImagingExplainer from '../components/ImagingExplainer';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

const STUDY_TYPES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'PET', 'Nuclear Medicine', 'Mammography', 'Fluoroscopy', 'Other'];

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

export default function Imaging() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({ queryKey: ['imaging'], queryFn: getImaging });

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explainTerm, setExplainTerm] = useState('');
  const [explainInput, setExplainInput] = useState('');

  const [form, setForm] = useState({
    study_type: 'CT', body_part: '', study_date: '',
    findings: '', impression: '', follow_up_recommended: false, follow_up_notes: '',
  });

  const createMut = useMutation({
    mutationFn: createImaging,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imaging'] });
      setShowForm(false);
      setForm({ study_type: 'CT', body_part: '', study_date: '', findings: '', impression: '', follow_up_recommended: false, follow_up_notes: '' });
    },
  });

  const handleLookup = () => {
    const val = explainInput.trim();
    if (val) setExplainTerm(val);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">🩻 Imaging Reports</h1>
          <p className="text-sm text-gray-500 mt-1">X-rays, CT scans, MRIs, and ultrasounds. Plain-language term lookup below.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + Add Report
        </button>
      </div>

      {/* Term lookup */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="text-sm font-medium text-gray-700">🔍 Look up a radiology term</div>
        <p className="text-xs text-gray-500">Type a word from your imaging report to get a plain-language explanation.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={explainInput}
            onChange={e => setExplainInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
            placeholder="e.g. atelectasis, pleural effusion, nodule…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={handleLookup} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            Explain
          </button>
          {explainTerm && (
            <button onClick={() => { setExplainTerm(''); setExplainInput(''); }} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
              Clear
            </button>
          )}
        </div>
        {explainTerm && <ImagingExplainer term={explainTerm} />}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Add Imaging Report</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Study type</label>
              <select value={form.study_type} onChange={e => setForm(p => ({ ...p, study_type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STUDY_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Body part</label>
              <input type="text" value={form.body_part} onChange={e => setForm(p => ({ ...p, body_part: e.target.value }))} placeholder="e.g. Chest, Abdomen, Lumbar spine" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Study date</label>
              <input type="date" value={form.study_date} onChange={e => setForm(p => ({ ...p, study_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="followup" checked={form.follow_up_recommended} onChange={e => setForm(p => ({ ...p, follow_up_recommended: e.target.checked }))} className="rounded" />
              <label htmlFor="followup" className="text-xs font-medium text-gray-700">Follow-up recommended</label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Findings</label>
            <textarea value={form.findings} onChange={e => setForm(p => ({ ...p, findings: e.target.value }))} rows={3} placeholder="Paste the Findings section from your report…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Impression / Conclusion</label>
            <textarea value={form.impression} onChange={e => setForm(p => ({ ...p, impression: e.target.value }))} rows={2} placeholder="Paste the Impression section from your report…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          {form.follow_up_recommended && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up notes</label>
              <input type="text" value={form.follow_up_notes} onChange={e => setForm(p => ({ ...p, follow_up_notes: e.target.value }))} placeholder="e.g. Repeat CT in 3 months" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate({ ...form, user_confirmed: true })} disabled={!form.study_type || createMut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {t('common.save')}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Report list */}
      {isLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
      {!isLoading && !reports.length && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🩻</div>
          <p className="text-sm">No imaging reports yet. Add one above or paste a report in the Inbox.</p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r: ImagingReport) => (
          <div key={r.id} className={clsx('bg-white border rounded-xl overflow-hidden', r.follow_up_recommended ? 'border-amber-300' : 'border-gray-200')}>
            <button
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">
                  {r.study_type === 'MRI' ? '🧲' : r.study_type === 'Ultrasound' ? '🔊' : r.study_type === 'CT' ? '💿' : '📋'}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {r.study_type}{r.body_part ? ` — ${r.body_part}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(r.study_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.follow_up_recommended && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Follow-up needed</span>
                )}
                <span className="text-gray-400 text-xs">{expandedId === r.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedId === r.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                {r.findings && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Findings</div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{r.findings}</p>
                  </div>
                )}
                {r.impression && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Impression</div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{r.impression}</p>
                  </div>
                )}
                {r.follow_up_notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    📅 Follow-up: {r.follow_up_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
