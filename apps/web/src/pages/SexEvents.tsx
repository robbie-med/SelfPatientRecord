import CrudTool from '../components/CrudTool';
import { getSexEvents, createSexEvent, deleteSexEvent, type SexEvent } from '../api/client';

export default function SexEvents() {
  return <CrudTool<SexEvent> config={{
    i18nBase: 'pages.sexEvents',
    queryKey: 'sex-events',
    list: getSexEvents,
    create: createSexEvent,
    remove: deleteSexEvent,
    fields: [
      { name: 'occurred_at', type: 'datetime', required: true },
      { name: 'kind', type: 'text' },
      { name: 'partner_type', type: 'text' },
      { name: 'protection', type: 'text' },
      { name: 'pregnancy_risk', type: 'select', options: ['none', 'low', 'possible', 'high'] },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => (r.occurred_at ?? '').slice(0, 16).replace('T', ' '),
    cardMeta: r => [r.kind, r.protection, r.pregnancy_risk],
  }} />;
}
