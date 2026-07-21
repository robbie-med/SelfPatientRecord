import CrudTool from '../components/CrudTool';
import { getAccessDevices, createAccessDevice, deleteAccessDevice, type AccessDevice } from '../api/client';

const KINDS = ['picc', 'port', 'tunneled_cvc', 'central_line', 'peripheral_iv', 'arterial_line', 'ng_tube', 'og_tube', 'g_tube', 'j_tube', 'foley', 'suprapubic_catheter', 'jp_drain', 'hemovac', 'chest_tube', 'tracheostomy', 'epidural', 'dialysis_catheter', 'ventricular_shunt', 'biliary_drain', 'nephrostomy', 'other'];

export default function AccessDevices() {
  return <CrudTool<AccessDevice> config={{
    i18nBase: 'pages.accessDevices',
    queryKey: 'access-devices',
    list: getAccessDevices,
    create: createAccessDevice,
    remove: deleteAccessDevice,
    fields: [
      { name: 'kind', type: 'select', required: true, options: KINDS },
      { name: 'subtype', type: 'text' },
      { name: 'anatomical_site', type: 'text' },
      { name: 'laterality', type: 'select', options: ['left', 'right', 'midline'] },
      { name: 'placed_at', type: 'date' },
      { name: 'placed_by', type: 'text' },
      { name: 'placed_facility', type: 'text' },
      { name: 'indication', type: 'text' },
      { name: 'gauge_or_size', type: 'text' },
      { name: 'lumens', type: 'number' },
      { name: 'dressing_change_interval_days', type: 'number' },
      { name: 'last_dressing_change_at', type: 'date' },
      { name: 'removed_at', type: 'date' },
      { name: 'removal_reason', type: 'text' },
      { name: 'complications_text', type: 'textarea' },
      { name: 'line_care_notes_markdown', type: 'textarea' },
    ],
    cardTitle: r => [r.kind, r.subtype].filter(Boolean).join(' — '),
    cardMeta: r => [r.anatomical_site, r.placed_at, r.removed_at ? `removed ${r.removed_at}` : 'active'],
  }} />;
}
