import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export type FieldType = 'text' | 'date' | 'datetime' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  fullWidth?: boolean;
  defaultValue?: string;
}

interface Row { id: string }

export interface CrudToolConfig<T extends Row> {
  i18nBase: string;
  queryKey: string;
  fields: FieldDef[];
  list: () => Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
  cardTitle: (row: T) => string;
  cardMeta?: (row: T) => Array<string | null | undefined>;
}

function nowLocalDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function todayLocalDate(): string {
  return nowLocalDatetime().slice(0, 10);
}

function emptyForm(fields: FieldDef[]): Record<string, string | boolean> {
  return Object.fromEntries(fields.map(f => {
    if (f.type === 'checkbox') return [f.name, false];
    if (f.defaultValue !== undefined) return [f.name, f.defaultValue];
    if (f.type === 'datetime') return [f.name, nowLocalDatetime()];
    if (f.type === 'date') return [f.name, todayLocalDate()];
    return [f.name, ''];
  }));
}

function toPayload(fields: FieldDef[], form: Record<string, string | boolean>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = form[f.name];
    if (f.type === 'checkbox') { out[f.name] = !!v; continue; }
    const s = String(v ?? '').trim();
    if (!s) { if (!f.required) continue; }
    if (f.type === 'number') {
      const n = parseFloat(s);
      if (!Number.isNaN(n)) out[f.name] = n;
      continue;
    }
    if (f.type === 'datetime' && s) { out[f.name] = new Date(s).toISOString(); continue; }
    if (s) out[f.name] = s;
  }
  return out;
}

export default function CrudTool<T extends Row>({ config }: { config: CrudToolConfig<T> }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { i18nBase, queryKey, fields } = config;
  const { data = [] } = useQuery({ queryKey: [queryKey], queryFn: config.list });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => emptyForm(fields));

  const createMut = useMutation({
    mutationFn: () => config.create(toPayload(fields, form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setShowForm(false); setForm(emptyForm(fields)); },
  });
  const deleteMut = useMutation({
    mutationFn: config.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const requiredFilled = fields.every(f => !f.required || String(form[f.name] ?? '').trim());
  const label = (name: string) => t(`${i18nBase}.fields.${name}`);
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t(`${i18nBase}.title`)}</h1>
        <p className="text-sm text-gray-500 mt-1">{t(`${i18nBase}.description`)}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
          + {t(`${i18nBase}.add`)}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.name} className={f.fullWidth || f.type === 'textarea' ? 'col-span-2' : ''}>
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mt-5">
                    <input type="checkbox" checked={!!form[f.name]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.checked }))} />
                    {label(f.name)}
                  </label>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {label(f.name)}{f.required && <span className="text-red-500"> *</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select value={String(form[f.name] ?? '')} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} className={inputCls}>
                        <option value=""></option>
                        {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea rows={3} value={String(form[f.name] ?? '')} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} className={inputCls} />
                    ) : (
                      <input
                        type={f.type === 'datetime' ? 'datetime-local' : f.type === 'number' ? 'number' : f.type}
                        step={f.type === 'number' ? 'any' : undefined}
                        value={String(form[f.name] ?? '')}
                        onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate()} disabled={!requiredFilled || createMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
            {createMut.isError && <span className="text-xs text-red-500 self-center">{t('common.error')}</span>}
          </div>
        </div>
      )}

      {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
      <div className="space-y-2">
        {data.map(row => (
          <div key={row.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{config.cardTitle(row)}</div>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
                {(config.cardMeta?.(row) ?? []).filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}
              </div>
            </div>
            <button onClick={() => { if (confirm(t('common.confirm') + '?')) deleteMut.mutate(row.id); }} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
