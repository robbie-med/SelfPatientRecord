import CrudTool from '../components/CrudTool';
import { getMicronutrients, createMicronutrient, deleteMicronutrient, type Micronutrient } from '../api/client';

export default function Micronutrients() {
  return <CrudTool<Micronutrient> config={{
    i18nBase: 'pages.micronutrients',
    queryKey: 'micronutrients',
    list: getMicronutrients,
    create: createMicronutrient,
    remove: deleteMicronutrient,
    fields: [
      { name: 'nutrient', type: 'text', required: true },
      { name: 'value', type: 'number', required: true },
      { name: 'unit', type: 'text' },
      { name: 'measured_at', type: 'date', required: true },
      { name: 'lab_source', type: 'text' },
      { name: 'ref_low', type: 'number' },
      { name: 'ref_high', type: 'number' },
      { name: 'optimal_low', type: 'number' },
      { name: 'optimal_high', type: 'number' },
      { name: 'supplementation_active', type: 'checkbox' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${r.nutrient}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`,
    cardMeta: r => [
      r.measured_at,
      r.ref_low != null && r.ref_high != null ? `ref ${r.ref_low}–${r.ref_high}` : null,
      r.supplementation_active ? '💊' : null,
    ],
  }} />;
}
