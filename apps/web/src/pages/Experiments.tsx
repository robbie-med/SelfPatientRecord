import CrudTool from '../components/CrudTool';
import { getExperiments, createExperiment, deleteExperiment, type Experiment } from '../api/client';

export default function Experiments() {
  return <CrudTool<Experiment> config={{
    i18nBase: 'pages.experiments',
    queryKey: 'experiments',
    list: getExperiments,
    create: createExperiment,
    remove: deleteExperiment,
    fields: [
      { name: 'hypothesis', type: 'text', required: true, fullWidth: true },
      { name: 'status', type: 'select', options: ['planned', 'baseline', 'intervention', 'completed', 'abandoned'] },
      { name: 'started_at', type: 'date' },
      { name: 'ended_at', type: 'date' },
      { name: 'baseline_period_days', type: 'number' },
      { name: 'intervention_period_days', type: 'number' },
      { name: 'intervention_description', type: 'textarea' },
      { name: 'conclusion_markdown', type: 'textarea' },
    ],
    cardTitle: r => r.hypothesis,
    cardMeta: r => [r.status, r.started_at, r.ended_at ? `→ ${r.ended_at}` : null],
  }} />;
}
