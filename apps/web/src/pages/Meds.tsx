import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMedications, createMedication, updateMedication,
  getAllergies, createAllergy, deleteAllergy,
  type Medication, type Allergy,
} from '../api/client';
import clsx from 'clsx';

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-yellow-50 text-yellow-700',
  moderate: 'bg-orange-50 text-orange-700',
  severe: 'bg-red-100 text-red-700',
  anaphylaxis: 'bg-red-200 text-red-900 font-bold',
  unknown: 'bg-gray-100 text-gray-600',
};

function MedCard({ med, onStop }: { med: Medication; onStop: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{med.name}</div>
          {med.generic_name && <div className="text-xs text-gray-400">{med.generic_name}</div>}
          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {med.dose && <span>{med.dose}</span>}
            {med.route && <span>{med.route}</span>}
            {med.frequency && <span>{med.frequency}</span>}
          </div>
          {med.indication && <div className="text-xs text-gray-400 mt-1">For: {med.indication}</div>}
          {med.prescriber && <div className="text-xs text-gray-400">Rx: {med.prescriber}</div>}
        </div>
        {med.status === 'current' && (
          <button
            onClick={() => onStop(med.id)}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-2 py-1 rounded shrink-0"
          >
            {t('meds.markStopped')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Meds() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: meds = [] } = useQuery({ queryKey: ['medications'], queryFn: () => getMedications() });
  const { data: allergies = [] } = useQuery({ queryKey: ['allergies'], queryFn: getAllergies });

  const [showMedForm, setShowMedForm] = useState(false);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', generic_name: '', dose: '', route: '', frequency: '', indication: '', prescriber: '', start_date: '', status: 'current' });
  const [allergyForm, setAllergyForm] = useState({ allergen: '', allergen_type: 'drug', reaction: '', severity: 'unknown' });

  const createMedMut = useMutation({
    mutationFn: createMedication,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['medications'] }); setShowMedForm(false); setMedForm({ name: '', generic_name: '', dose: '', route: '', frequency: '', indication: '', prescriber: '', start_date: '', status: 'current' }); },
  });

  const stopMedMut = useMutation({
    mutationFn: ({ id }: { id: string }) => updateMedication(id, { status: 'discontinued', end_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });

  const createAllergyMut = useMutation({
    mutationFn: createAllergy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allergies'] }); setShowAllergyForm(false); setAllergyForm({ allergen: '', allergen_type: 'drug', reaction: '', severity: 'unknown' }); },
  });

  const deleteAllergyMut = useMutation({
    mutationFn: deleteAllergy,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allergies'] }),
  });

  const current = meds.filter((m: Medication) => m.status === 'current' || m.status === 'prn');
  const prior = meds.filter((m: Medication) => m.status === 'discontinued' || m.status === 'historical');

  const handlePrint = () => {
    const lines = [
      'MEDICATION LIST',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      'CURRENT MEDICATIONS:',
      ...current.map((m: Medication) => `  • ${m.name}${m.dose ? ' ' + m.dose : ''}${m.frequency ? ', ' + m.frequency : ''}${m.indication ? ' (for: ' + m.indication + ')' : ''}`),
      '',
      'ALLERGIES:',
      ...allergies.map((a: Allergy) => `  • ${a.allergen}${a.reaction ? ' — ' + a.reaction : ''}${a.severity ? ' [' + a.severity + ']' : ''}`),
    ];
    const w = window.open('', '_blank');
    if (w) { w.document.write(`<pre style="font-family:monospace;padding:2rem">${lines.join('\n')}</pre>`); w.print(); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('meds.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('meds.description')}</p>
        </div>
        <button onClick={handlePrint} className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200">
          🖨️ {t('meds.printList')}
        </button>
      </div>

      {/* Allergies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">🚨 {t('meds.allergies')}</h2>
          <button onClick={() => setShowAllergyForm(v => !v)} className="text-xs text-blue-600 hover:underline">{t('meds.addAllergy')}</button>
        </div>
        {showAllergyForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'allergen', label: t('meds.allergen'), type: 'text' },
                { key: 'reaction', label: t('meds.reaction'), type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} value={(allergyForm as Record<string, string>)[f.key]} onChange={e => setAllergyForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={allergyForm.allergen_type} onChange={e => setAllergyForm(p => ({ ...p, allergen_type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['drug', 'food', 'environmental', 'contrast', 'latex', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                <select value={allergyForm.severity} onChange={e => setAllergyForm(p => ({ ...p, severity: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['mild', 'moderate', 'severe', 'anaphylaxis', 'unknown'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createAllergyMut.mutate({ ...allergyForm, status: 'active', user_confirmed: true })} disabled={!allergyForm.allergen || createAllergyMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowAllergyForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {!allergies.length && <p className="text-sm text-gray-400">{t('meds.noAllergies')}</p>}
        <div className="space-y-2">
          {allergies.map((a: Allergy) => (
            <div key={a.id} className="flex items-center gap-3 bg-white border border-red-100 rounded-lg px-4 py-2.5">
              <span className="text-red-500">⚠️</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 text-sm">{a.allergen}</span>
                {a.reaction && <span className="text-gray-500 text-sm ml-2">— {a.reaction}</span>}
              </div>
              {a.severity && <span className={clsx('text-xs px-2 py-0.5 rounded-full', SEVERITY_COLORS[a.severity] ?? 'bg-gray-100 text-gray-600')}>{a.severity}</span>}
              <button onClick={() => { if (confirm('Remove this allergy?')) deleteAllergyMut.mutate(a.id); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Current meds */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">💊 {t('meds.current')}</h2>
          <button onClick={() => setShowMedForm(v => !v)} className="text-xs text-blue-600 hover:underline">{t('meds.addMed')}</button>
        </div>
        {showMedForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name', label: t('meds.fields.name'), required: true },
                { key: 'generic_name', label: t('meds.fields.genericName') },
                { key: 'dose', label: t('meds.fields.dose') },
                { key: 'route', label: t('meds.fields.route') },
                { key: 'frequency', label: t('meds.fields.frequency') },
                { key: 'indication', label: t('meds.fields.indication') },
                { key: 'prescriber', label: t('meds.fields.prescriber') },
                { key: 'start_date', label: t('meds.fields.startDate'), type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type ?? 'text'} value={(medForm as Record<string, string>)[f.key]} onChange={e => setMedForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => createMedMut.mutate({ ...medForm, user_confirmed: true })} disabled={!medForm.name || createMedMut.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowMedForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {!current.length && <p className="text-sm text-gray-400">{t('meds.noMeds')}</p>}
        <div className="space-y-2">
          {current.map((m: Medication) => <MedCard key={m.id} med={m} onStop={id => stopMedMut.mutate({ id })} />)}
        </div>
      </div>

      {/* Prior meds */}
      {prior.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">📋 {t('meds.prior')}</h2>
          <div className="space-y-2">
            {prior.map((m: Medication) => (
              <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 opacity-75">
                <span className="text-sm text-gray-700">{m.name}</span>
                {m.dose && <span className="text-xs text-gray-400 ml-2">{m.dose}</span>}
                {m.end_date && <span className="text-xs text-gray-400 ml-2">stopped {m.end_date}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
