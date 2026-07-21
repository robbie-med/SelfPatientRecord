import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getContractions, createContraction, updateContraction, deleteContraction, type Contraction } from '../api/client';

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

const ms = (iso: string) => new Date(iso).getTime();

export default function Contractions() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['contractions'], queryFn: getContractions });
  const [elapsed, setElapsed] = useState(0);

  const active = data.find(cx => !cx.ended_at) ?? null;
  const done = data.filter(cx => cx.ended_at);

  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Date.now() - ms(active.started_at));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [active]);

  const startMut = useMutation({
    mutationFn: () => createContraction({ started_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractions'] }),
  });
  const stopMut = useMutation({
    mutationFn: () => updateContraction(active!.id, { ended_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractions'] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteContraction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractions'] }),
  });

  // 5-1-1 pattern: avg interval ≤5 min and avg duration ≥55s across ≥4 contractions in the last hour
  const recent = done.filter(cx => Date.now() - ms(cx.started_at) <= 3600000);
  let pattern: 'go' | '511' | 'info' | null = null;
  let avgIntervalMin = 0;
  let avgDurationSec = 0;
  if (recent.length >= 4) {
    const intervals: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      intervals.push(ms(recent[i].started_at) - ms(recent[i + 1].started_at));
    }
    const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : Infinity;
    const avgDuration = recent.reduce((a, cx) => a + (ms(cx.ended_at!) - ms(cx.started_at)), 0) / recent.length;
    avgIntervalMin = Math.round(avgInterval / 60000);
    avgDurationSec = Math.round(avgDuration / 1000);
    if (avgInterval <= 3 * 60000 && avgDuration >= 55000) pattern = 'go';
    else if (avgInterval <= 5 * 60000 && avgDuration >= 55000) pattern = '511';
    else pattern = 'info';
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.contractions.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.contractions.description')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-3">
        <div className="text-sm font-medium text-gray-500">
          {active ? t('pages.contractions.inProgress') : t('pages.contractions.idle')}
        </div>
        {active && <div className="text-4xl font-bold text-amber-600 tabular-nums">{fmtDuration(elapsed)}</div>}
        <button
          onClick={() => (active ? stopMut.mutate() : startMut.mutate())}
          disabled={startMut.isPending || stopMut.isPending}
          className={`w-full py-4 text-lg rounded-xl text-white disabled:opacity-50 ${active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}
        >
          {active ? t('pages.contractions.end') : t('pages.contractions.start')}
        </button>
      </div>

      {pattern === 'go' && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="text-sm font-bold text-red-700">{t('pages.contractions.alertGoTitle')}</div>
          <p className="text-xs text-red-600 mt-1">{t('pages.contractions.alertGoBody', { interval: avgIntervalMin, duration: avgDurationSec })}</p>
        </div>
      )}
      {pattern === '511' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="text-sm font-bold text-amber-700">{t('pages.contractions.alert511Title')}</div>
          <p className="text-xs text-amber-700 mt-1">{t('pages.contractions.alert511Body', { interval: avgIntervalMin, duration: avgDurationSec })}</p>
        </div>
      )}
      {pattern === 'info' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          {t('pages.contractions.notYet', { interval: avgIntervalMin, duration: avgDurationSec, count: recent.length })}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('pages.contractions.history')}</h2>
        {!done.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
        <div className="space-y-2">
          {done.map((cx, i) => {
            const prev = done[i + 1];
            const interval = prev ? ms(cx.started_at) - ms(prev.started_at) : null;
            return (
              <div key={cx.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
                <div className="text-sm text-gray-900">{cx.started_at.slice(0, 16).replace('T', ' ')}</div>
                <div className="text-xs text-gray-500">
                  {fmtDuration(ms(cx.ended_at!) - ms(cx.started_at))} {t('pages.contractions.long')}
                  {interval !== null && <span className="ml-2">· {t('pages.contractions.every', { interval: fmtDuration(interval) })}</span>}
                </div>
                <button onClick={() => deleteMut.mutate(cx.id)} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
