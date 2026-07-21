import CrudTool from '../components/CrudTool';
import { getSensitivities, createSensitivity, deleteSensitivity, type Sensitivity } from '../api/client';

export default function Sensitivities() {
  return <CrudTool<Sensitivity> config={{
    i18nBase: 'pages.sensitivities',
    queryKey: 'sensitivities',
    list: getSensitivities,
    create: createSensitivity,
    remove: deleteSensitivity,
    fields: [
      { name: 'substance', type: 'text', required: true },
      { name: 'kind', type: 'select', options: ['intolerance', 'sensitivity', 'other'] },
      { name: 'reaction', type: 'text' },
      { name: 'severity', type: 'select', options: ['mild', 'moderate', 'severe'] },
      { name: 'onset_date', type: 'date' },
      { name: 'confirmed_by', type: 'text' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.substance,
    cardMeta: r => [r.kind, r.reaction, r.severity],
  }} />;
}
