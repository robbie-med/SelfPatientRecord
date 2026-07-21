import CrudTool from '../components/CrudTool';
import { getEquipment, createEquipment, deleteEquipment, type Equipment } from '../api/client';

export default function EquipmentPage() {
  return <CrudTool<Equipment> config={{
    i18nBase: 'pages.equipment',
    queryKey: 'equipment',
    list: getEquipment,
    create: createEquipment,
    remove: deleteEquipment,
    fields: [
      { name: 'kind', type: 'text', required: true },
      { name: 'brand', type: 'text' },
      { name: 'model', type: 'text' },
      { name: 'serial', type: 'text' },
      { name: 'acquired_date', type: 'date' },
      { name: 'retired_date', type: 'date' },
      { name: 'last_serviced_date', type: 'date' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.kind,
    cardMeta: r => [[r.brand, r.model].filter(Boolean).join(' '), r.acquired_date, r.retired_date ? `→ ${r.retired_date}` : null],
  }} />;
}
