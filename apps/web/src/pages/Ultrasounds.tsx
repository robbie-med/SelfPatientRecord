import CrudTool from '../components/CrudTool';
import { getUltrasounds, createUltrasound, deleteUltrasound, type Ultrasound } from '../api/client';

export default function Ultrasounds() {
  return <CrudTool<Ultrasound> config={{
    i18nBase: 'pages.ultrasounds',
    queryKey: 'ultrasounds',
    list: getUltrasounds,
    create: createUltrasound,
    remove: deleteUltrasound,
    fields: [
      { name: 'performed_at', type: 'date', required: true },
      { name: 'organ_or_site', type: 'text', required: true },
      { name: 'indication', type: 'text' },
      { name: 'sonographer', type: 'text' },
      { name: 'facility', type: 'text' },
      { name: 'findings', type: 'textarea' },
    ],
    cardTitle: r => r.organ_or_site,
    cardMeta: r => [r.performed_at, r.facility, r.indication],
  }} />;
}
