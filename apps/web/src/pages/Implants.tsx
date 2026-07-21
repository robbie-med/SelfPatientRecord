import CrudTool from '../components/CrudTool';
import { getImplants, createImplant, deleteImplant, type Implant } from '../api/client';

export default function Implants() {
  return <CrudTool<Implant> config={{
    i18nBase: 'pages.implants',
    queryKey: 'implants',
    list: getImplants,
    create: createImplant,
    remove: deleteImplant,
    fields: [
      { name: 'kind', type: 'select', required: true, options: ['implant', 'extraction'] },
      { name: 'name', type: 'text', required: true },
      { name: 'body_site', type: 'text' },
      { name: 'laterality', type: 'select', options: ['left', 'right', 'bilateral', 'midline'] },
      { name: 'manufacturer', type: 'text' },
      { name: 'model', type: 'text' },
      { name: 'serial', type: 'text' },
      { name: 'lot', type: 'text' },
      { name: 'placed_date', type: 'date' },
      { name: 'removed_date', type: 'date' },
      { name: 'removal_reason', type: 'text' },
      { name: 'mri_safety', type: 'select', options: ['safe', 'conditional', 'unsafe', 'unknown'] },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.name,
    cardMeta: r => [r.kind, r.body_site, r.placed_date, r.removed_date ? `→ ${r.removed_date}` : null],
  }} />;
}
