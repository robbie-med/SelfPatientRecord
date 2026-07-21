import CrudTool from '../components/CrudTool';
import { getCycles, createCycle, deleteCycle, type Cycle } from '../api/client';

export default function CycleTracker() {
  return <CrudTool<Cycle> config={{
    i18nBase: 'pages.cycles',
    queryKey: 'cycles',
    list: getCycles,
    create: createCycle,
    remove: deleteCycle,
    fields: [
      { name: 'started_at', type: 'date', required: true },
      { name: 'ended_at', type: 'date' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.started_at,
    cardMeta: r => [
      r.ended_at ? `→ ${r.ended_at}` : null,
      r.ended_at ? `${Math.round((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 86400000) + 1}d` : null,
      r.notes,
    ],
  }} />;
}
