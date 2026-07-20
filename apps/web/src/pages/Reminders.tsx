import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getReminders, createReminder, deleteReminder,
  completeReminder, dismissReminder, snoozeReminder,
  type Reminder,
} from '../api/client';

const EMPTY = { kind: 'general', title: '', body: '', due_at: '' };

export default function Reminders() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['reminders'], queryFn: getReminders });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reminders'] });

  const createMut = useMutation({
    mutationFn: (f: typeof EMPTY) => createReminder({
      kind: f.kind,
      title: f.title,
      body: f.body || null,
      due_at: f.due_at ? new Date(f.due_at).toISOString() : null,
    }),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); },
  });
  const deleteMut = useMutation({ mutationFn: deleteReminder, onSuccess: invalidate });
  const completeMut = useMutation({ mutationFn: completeReminder, onSuccess: invalidate });
  const dismissMut = useMutation({ mutationFn: dismissReminder, onSuccess: invalidate });
  const snoozeMut = useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) => snoozeReminder(id, until),
    onSuccess: invalidate,
  });

  const active = data.filter((r: Reminder) => !r.completed_at && !r.dismissed_at);
  const archived = data.filter((r: Reminder) => r.completed_at || r.dismissed_at);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.reminders.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.reminders.description')}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + {t('pages.reminders.add')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.reminders.kind')}</label>
              <input value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.reminders.dueAt')}</label>
              <input type="datetime-local" value={form.due_at} onChange={e => setForm(p => ({ ...p, due_at: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.reminders.titleField')}</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.reminders.body')}</label>
              <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate(form)} disabled={!form.title || !form.kind || createMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('pages.reminders.active')}</h2>
        {!active.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
        <div className="space-y-2">
          {active.map((r: Reminder) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{r.title}</div>
                  {r.body && <div className="text-sm text-gray-600 mt-1">{r.body}</div>}
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
                    <span>{r.kind}</span>
                    {r.due_at && <span>{t('pages.reminders.dueAt')}: {new Date(r.due_at).toLocaleString()}</span>}
                    {r.snoozed_until && <span>{t('pages.reminders.snoozedUntil')}: {new Date(r.snoozed_until).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs shrink-0">
                  <button onClick={() => completeMut.mutate(r.id)} className="text-green-600 hover:underline">{t('pages.reminders.complete')}</button>
                  <button onClick={() => {
                    const until = prompt(t('pages.reminders.snoozeUntilPrompt'), new Date(Date.now() + 86400000).toISOString());
                    if (until) snoozeMut.mutate({ id: r.id, until });
                  }} className="text-blue-600 hover:underline">{t('pages.reminders.snooze')}</button>
                  <button onClick={() => dismissMut.mutate(r.id)} className="text-gray-500 hover:underline">{t('pages.reminders.dismiss')}</button>
                  <button onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(r.id); }} className="text-red-500 hover:underline">{t('common.delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {archived.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">{t('pages.reminders.archived')}</h2>
          <div className="space-y-2">
            {archived.map((r: Reminder) => (
              <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 opacity-75 flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-700">{r.title}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {r.completed_at ? `✓ ${new Date(r.completed_at).toLocaleDateString()}` : ''}
                    {r.dismissed_at ? `✕ ${new Date(r.dismissed_at).toLocaleDateString()}` : ''}
                  </span>
                </div>
                <button onClick={() => deleteMut.mutate(r.id)} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
