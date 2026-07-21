import CrudTool from '../components/CrudTool';
import { getContractions, createContraction, deleteContraction, type Contraction } from '../api/client';

export default function Contractions() {
  return <CrudTool<Contraction> config={{
    i18nBase: 'pages.contractions',
    queryKey: 'contractions',
    list: getContractions,
    create: createContraction,
    remove: deleteContraction,
    fields: [
      { name: 'started_at', type: 'datetime', required: true },
      { name: 'ended_at', type: 'datetime' },
      { name: 'intensity', type: 'select', options: ['mild', 'moderate', 'strong'] },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => (r.started_at ?? '').slice(0, 16).replace('T', ' '),
    cardMeta: r => [r.ended_at ? `→ ${r.ended_at.slice(11, 16)}` : null, r.intensity],
  }} />;
}
