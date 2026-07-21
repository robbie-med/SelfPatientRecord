import CrudTool from '../components/CrudTool';
import { getSurgeries, createSurgery, deleteSurgery, type Surgery } from '../api/client';

export default function Surgeries() {
  return <CrudTool<Surgery> config={{
    i18nBase: 'pages.surgeries',
    queryKey: 'surgeries',
    list: getSurgeries,
    create: createSurgery,
    remove: deleteSurgery,
    fields: [
      { name: 'name', type: 'text', required: true, fullWidth: true },
      { name: 'surgery_date', type: 'date' },
      { name: 'surgeon', type: 'text' },
      { name: 'facility', type: 'text' },
      { name: 'approach', type: 'text' },
      { name: 'indication', type: 'text', fullWidth: true },
      { name: 'complications_text', type: 'textarea' },
      { name: 'recovery_notes', type: 'textarea' },
    ],
    cardTitle: s => s.name,
    cardMeta: s => [s.surgery_date, s.facility, s.surgeon],
  }} />;
}
