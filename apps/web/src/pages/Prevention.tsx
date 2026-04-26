import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getCareGaps, dismissCareGap, getGuidelines, getVaccines, getGuidelinePacks,
  createVaccine, type CareGap, type Recommendation, type Vaccine,
} from '../api/client';
import { format, parseISO, differenceInDays } from 'date-fns';
import clsx from 'clsx';

const URGENCY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  soon: 'bg-amber-50 text-amber-700 border-amber-200',
  routine: 'bg-blue-50 text-blue-700 border-blue-200',
};

const URGENCY_ICONS: Record<string, string> = { urgent: '🔴', soon: '🟡', routine: '🔵' };

const GRADE_COLORS: Record<string, string> = { A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800', I: 'bg-gray-100 text-gray-600' };

export default function Prevention() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: gaps = [] } = useQuery({ queryKey: ['care-gaps'], queryFn: getCareGaps });
  const { data: guidelines = [] } = useQuery({ queryKey: ['guidelines'], queryFn: getGuidelines });
  const { data: vaccines = [] } = useQuery({ queryKey: ['vaccines'], queryFn: getVaccines });
  const { data: packs = [] } = useQuery({ queryKey: ['guideline-packs'], queryFn: getGuidelinePacks });

  const STALE_DAYS = 365;
  const stalePacks = packs.filter(p => differenceInDays(new Date(), parseISO(p.last_reviewed)) > STALE_DAYS);

  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: '', administered_date: '', dose_number: '', facility: '', lot_number: '' });

  const dismissMut = useMutation({
    mutationFn: dismissCareGap,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care-gaps'] }),
  });

  const createVaccineMut = useMutation({
    mutationFn: createVaccine,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vaccines'] }); setShowVaccineForm(false); setVaccineForm({ vaccine_name: '', administered_date: '', dose_number: '', facility: '', lot_number: '' }); },
  });

  // Group guidelines by topic
  const guidelinesByTopic = guidelines.reduce<Record<string, Recommendation[]>>((acc, g) => {
    const key = g.topic;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const sortedGaps = [...gaps].sort((a, b) => {
    const order = { urgent: 0, soon: 1, routine: 2 };
    return (order[a.urgency as keyof typeof order] ?? 2) - (order[b.urgency as keyof typeof order] ?? 2);
  });

  const formatTopic = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('prevention.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('prevention.description')}</p>
      </div>

      {/* Staleness warnings */}
      {stalePacks.map(p => (
        <div key={p.country} className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span className="shrink-0">⚠️</span>
          <span>{t('prevention.packStale', { country: p.country, date: format(parseISO(p.last_reviewed), 'MMMM d, yyyy') })}</span>
        </div>
      ))}

      {/* Care gaps */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ {t('prevention.careGaps')}</h2>
        {!sortedGaps.length && <p className="text-sm text-gray-400">{t('prevention.noCareGaps')}</p>}
        <div className="space-y-3">
          {sortedGaps.map((gap: CareGap) => (
            <div key={gap.id} className={clsx('border rounded-lg p-4', URGENCY_COLORS[gap.urgency] ?? 'bg-gray-50 border-gray-200')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2 items-start flex-1 min-w-0">
                  <span className="text-base shrink-0">{URGENCY_ICONS[gap.urgency] ?? '🔵'}</span>
                  <div>
                    <div className="text-sm font-medium">{gap.title}</div>
                    <div className="text-xs mt-0.5 opacity-80">{gap.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs opacity-70 capitalize">{t(`prevention.urgency.${gap.urgency}` as Parameters<typeof t>[0])}</span>
                  <button onClick={() => dismissMut.mutate(gap.id)} className="text-xs opacity-60 hover:opacity-100 underline">{t('prevention.dismiss')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 {t('prevention.guidelines')}</h2>
        {!guidelines.length && <p className="text-sm text-gray-400">{t('prevention.noGuidelines')}</p>}
        <div className="space-y-4">
          {Object.entries(guidelinesByTopic).map(([topic, recs]) => (
            <div key={topic}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{formatTopic(topic)}</div>
              <div className="space-y-2">
                {recs.map((rec: Recommendation) => (
                  <div key={rec.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{rec.country}</span>
                          {rec.evidence_grade && (
                            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', GRADE_COLORS[rec.evidence_grade] ?? 'bg-gray-100 text-gray-600')}>
                              Grade {rec.evidence_grade}
                            </span>
                          )}
                          {rec.patient_status === 'comparison_only' && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Comparison</span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{rec.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{rec.patient_facing_summary}</div>
                        {rec.interval_months && (
                          <div className="text-xs text-gray-400 mt-1">Every {rec.interval_months} months</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vaccines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">💉 {t('prevention.vaccines')}</h2>
          <button onClick={() => setShowVaccineForm(v => !v)} className="text-xs text-blue-600 hover:underline">{t('prevention.addVaccine')}</button>
        </div>

        {showVaccineForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'vaccine_name', label: 'Vaccine name', required: true },
                { key: 'administered_date', label: 'Date administered', type: 'date', required: true },
                { key: 'dose_number', label: 'Dose #', type: 'number' },
                { key: 'facility', label: 'Facility' },
                { key: 'lot_number', label: 'Lot number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type ?? 'text'} value={(vaccineForm as Record<string, string>)[f.key]} onChange={e => setVaccineForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createVaccineMut.mutate({ vaccine_name: vaccineForm.vaccine_name, administered_date: vaccineForm.administered_date, dose_number: vaccineForm.dose_number ? parseInt(vaccineForm.dose_number) : undefined, facility: vaccineForm.facility || undefined, lot_number: vaccineForm.lot_number || undefined, user_confirmed: true })}
                disabled={!vaccineForm.vaccine_name || !vaccineForm.administered_date || createVaccineMut.isPending}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {t('common.save')}
              </button>
              <button onClick={() => setShowVaccineForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {!vaccines.length && <p className="text-sm text-gray-400">{t('prevention.noVaccines')}</p>}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {vaccines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left px-4 py-2 font-medium">Vaccine</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Dose</th>
                  <th className="text-left px-4 py-2 font-medium">Facility</th>
                </tr>
              </thead>
              <tbody>
                {vaccines.map((v: Vaccine) => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{v.vaccine_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{v.administered_date}</td>
                    <td className="px-4 py-2.5 text-gray-500">{v.dose_number ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{v.facility ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
