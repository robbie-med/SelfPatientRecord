import CrudTool from '../components/CrudTool';
import { getPregnancyOutcomes, createPregnancyOutcome, deletePregnancyOutcome, type PregnancyOutcome } from '../api/client';

export default function PregnancyOutcomes() {
  return <CrudTool<PregnancyOutcome> config={{
    i18nBase: 'pages.pregnancyOutcomes',
    queryKey: 'pregnancy-outcomes',
    list: getPregnancyOutcomes,
    create: createPregnancyOutcome,
    remove: deletePregnancyOutcome,
    fields: [
      { name: 'outcome', type: 'select', required: true, options: ['miscarriage', 'stillbirth', 'ectopic', 'termination', 'live_birth', 'chemical'] },
      { name: 'outcome_date', type: 'date', required: true },
      { name: 'conception_date_est', type: 'date' },
      { name: 'gestational_age_at_outcome', type: 'text' },
      { name: 'treatment', type: 'text', fullWidth: true },
      { name: 'emotional_notes', type: 'textarea' },
      { name: 'future_planning_notes', type: 'textarea' },
    ],
    cardTitle: r => r.outcome,
    cardMeta: r => [r.outcome_date, r.gestational_age_at_outcome, r.treatment],
  }} />;
}
