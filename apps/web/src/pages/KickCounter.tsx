import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getKickSessions, createKickSession, updateKickSession, deleteKickSession, type KickSession } from '../api/client';

const GOAL = 10;
const LIMIT_MS = 2 * 60 * 60 * 1000;

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function KickCounter() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['kick-sessions'], queryFn: getKickSessions });
  const [elapsed, setElapsed] = useState(0);
  const [justPassed, setJustPassed] = useState<number | null>(null);

  const active = data.find(s => !s.ended_at) ?? null;
  const history = data.filter(s => s.ended_at);

  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Date.now() - new Date(active.started_at).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const startMut = useMutation({
    mutationFn: () => createKickSession({ started_at: new Date().toISOString(), count: 0 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kick-sessions'] }),
  });

  const endSession = (count: number) => {
    if (!active) return;
    updateMut.mutate({ count, ended_at: new Date().toISOString() });
    if (count >= GOAL) setJustPassed(count);
  };

  const updateMut = useMutation({
    mutationFn: (patch: Partial<KickSession>) => updateKickSession(active!.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kick-sessions'] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteKickSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kick-sessions'] }),
  });

  const tap = () => {
    if (!active) return;
    const count = (active.count ?? 0) + 1;
    if (count >= GOAL) endSession(count);
    else updateMut.mutate({ count });
  };

  const overLimit = active && elapsed >= LIMIT_MS && (active.count ?? 0) < GOAL;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.kickCounter.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.kickCounter.description')}</p>
      </div>

      {justPassed !== null && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
          <div className="text-lg font-semibold text-green-700">{t('pages.kickCounter.successTitle')}</div>
          <button onClick={() => setJustPassed(null)} className="mt-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            {t('pages.kickCounter.another')}
          </button>
        </div>
      )}

      {!active && justPassed === null && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4">
          <p className="text-sm font-medium text-gray-600">{t('pages.kickCounter.goal', { goal: GOAL })}</p>
          <button
            onClick={() => startMut.mutate()}
            disabled={startMut.isPending}
            className="w-full py-4 text-lg bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {t('pages.kickCounter.startSession')}
          </button>
        </div>
      )}

      {active && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 text-center">
          <div className="text-5xl font-bold text-blue-600">{active.count ?? 0}</div>
          <div className="text-sm text-gray-500">{t('pages.kickCounter.movements')}</div>
          <div className="text-sm text-gray-600">
            {t('pages.kickCounter.elapsed')}: <span className="font-semibold tabular-nums">{fmtDuration(elapsed)}</span>
          </div>
          {overLimit ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
              <div className="text-sm font-semibold text-red-700">{t('pages.kickCounter.limitAlertTitle', { goal: GOAL })}</div>
              <p className="text-xs text-red-600 mt-1">{t('pages.kickCounter.limitAlertBody')}</p>
            </div>
          ) : (
            <button onClick={tap} className="w-full py-6 text-xl bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800">
              {t('pages.kickCounter.tap')}
            </button>
          )}
          <button
            onClick={() => endSession(active.count ?? 0)}
            className="w-full py-2 text-sm bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            {t('pages.kickCounter.endEarly')}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('pages.kickCounter.history')}</h2>
        {!history.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
        <div className="space-y-2">
          {history.map(s => {
            const passed = (s.count ?? 0) >= GOAL;
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
                <div className="text-sm text-gray-900">
                  {s.started_at.slice(0, 16).replace('T', ' ')}
                  <span className="text-xs text-gray-400 ml-2">{fmtDuration(new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime())}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.count ?? 0}/{GOAL} · {passed ? t('pages.kickCounter.pass') : t('pages.kickCounter.low')}
                  </span>
                  <button onClick={() => deleteMut.mutate(s.id)} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
