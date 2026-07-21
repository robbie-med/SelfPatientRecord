import CrudTool from '../components/CrudTool';
import { getJaundiceObservations, createJaundiceObservation, deleteJaundiceObservation, type JaundiceObservation } from '../api/client';

export default function JaundiceTracker() {
  return <CrudTool<JaundiceObservation> config={{
    i18nBase: 'pages.jaundice',
    queryKey: 'jaundice-observations',
    list: getJaundiceObservations,
    create: createJaundiceObservation,
    remove: deleteJaundiceObservation,
    fields: [
      { name: 'infant_dob', type: 'date', required: true },
      { name: 'observed_at', type: 'date', required: true },
      { name: 'day_of_life', type: 'number' },
      { name: 'area_affected', type: 'select', options: ['face', 'chest', 'abdomen', 'legs', 'palms_soles'] },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.observed_at,
    cardMeta: r => [r.day_of_life != null ? `DOL ${r.day_of_life}` : null, r.area_affected],
  }} />;
}
