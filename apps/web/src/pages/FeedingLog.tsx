import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getFeedingEvents, createFeedingEvent, updateFeedingEvent, deleteFeedingEvent, type FeedingEvent } from '../api/client';

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const ms = (iso: string) => new Date(iso).getTime();

export default function FeedingLog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['feeding-events'], queryFn: getFeedingEvents });
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState('');
  const [bottleKind, setBottleKind] = useState('bottle_breastmilk');

  const active = data.find(f => !f.ended_at && f.kind === 'breast') ?? null;
  const last24 = data.filter(f => Date.now() - ms(f.started_at) < 86400000);

  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Date.now() - ms(active.started_at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const startBreastMut = useMutation({
    mutationFn: (side: string) => createFeedingEvent({ started_at: new Date().toISOString(), kind: 'breast', side }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeding-events'] }),
  });
  const stopMut = useMutation({
    mutationFn: () => updateFeedingEvent(active!.id, { ended_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeding-events'] }),
  });
  const bottleMut = useMutation({
    mutationFn: () => createFeedingEvent({
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      kind: bottleKind,
      volume_ml: volume ? parseFloat(volume) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feeding-events'] }); setVolume(''); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteFeedingEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeding-events'] }),
  });

  const lowFeeds = data.length > 0 && last24.length < 8;
  const inputCls = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('pages.feedingLog.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pages.feedingLog.description')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${lowFeeds ? 'text-red-600' : 'text-teal-600'}`}>{last24.length}</div>
          <div className="text-xs text-gray-500">{t('pages.feedingLog.feeds24')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">{data.length ? data[0].started_at.slice(11, 16) : '—'}</div>
          <div className="text-xs text-gray-500">{t('pages.feedingLog.lastFeed')}</div>
        </div>
      </div>

      {lowFeeds && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-700">{t('pages.feedingLog.lowFeedsTitle')}</div>
          <p className="text-xs text-red-600 mt-1">{t('pages.feedingLog.lowFeedsBody')}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {active ? (
          <div className="text-center space-y-3">
            <div className="text-sm text-gray-500">{t('pages.feedingLog.breast')} · {t(`pages.feedingLog.${active.side}`)}</div>
            <div className="text-4xl font-bold text-teal-600 tabular-nums">{fmtDuration(elapsed)}</div>
            <button onClick={() => stopMut.mutate()} className="w-full py-3 text-lg bg-rose-600 text-white rounded-xl hover:bg-rose-700">
              {t('pages.feedingLog.stop')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => startBreastMut.mutate('left')} disabled={startBreastMut.isPending} className="py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50">
              🤱 {t('pages.feedingLog.left')}
            </button>
            <button onClick={() => startBreastMut.mutate('right')} disabled={startBreastMut.isPending} className="py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50">
              🤱 {t('pages.feedingLog.right')}
            </button>
          </div>
        )}

        {!active && (
          <div className="flex items-end gap-2 border-t border-gray-100 pt-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.feedingLog.bottle')}</label>
              <select value={bottleKind} onChange={e => setBottleKind(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="bottle_breastmilk">{t('pages.feedingLog.bottleBreastmilk')}</option>
                <option value="formula">{t('pages.feedingLog.formula')}</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('pages.feedingLog.volume')}</label>
              <input type="number" min="0" value={volume} onChange={e => setVolume(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <button onClick={() => bottleMut.mutate()} disabled={bottleMut.isPending} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {t('pages.feedingLog.logBottle')}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('pages.feedingLog.history')}</h2>
        {!data.length && <p className="text-sm text-gray-400">{t('common.empty')}</p>}
        <div className="space-y-2">
          {data.map(f => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
              <div className="text-sm text-gray-900">
                {f.started_at.slice(0, 16).replace('T', ' ')}
                <span className="ml-2">{f.kind === 'breast' ? '🤱' : '🍼'} {t(`pages.feedingLog.${f.kind === 'breast' ? (f.side ?? 'breast') : f.kind}`)}</span>
              </div>
              <div className="text-xs text-gray-500">
                {f.kind === 'breast' && f.ended_at && `${fmtDuration(ms(f.ended_at) - ms(f.started_at))} min`}
                {f.volume_ml != null && `${f.volume_ml} ml`}
              </div>
              <button onClick={() => deleteMut.mutate(f.id)} className="text-xs text-gray-400 hover:text-red-500">{t('common.delete')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
