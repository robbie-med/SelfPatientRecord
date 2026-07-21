import CrudTool from '../components/CrudTool';
import { getPregnancyTests, createPregnancyTest, deletePregnancyTest, type PregnancyTest } from '../api/client';

export default function PregnancyTests() {
  return <CrudTool<PregnancyTest> config={{
    i18nBase: 'pages.pregnancyTests',
    queryKey: 'pregnancy-tests',
    list: getPregnancyTests,
    create: createPregnancyTest,
    remove: deletePregnancyTest,
    fields: [
      { name: 'taken_at', type: 'datetime', required: true },
      { name: 'result', type: 'select', options: ['negative', 'positive', 'faint', 'invalid'] },
      { name: 'kind', type: 'select', options: ['urine', 'blood_qualitative', 'blood_quantitative'] },
      { name: 'follow_up_hcg_quantitative', type: 'number' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${(r.taken_at ?? '').slice(0, 16).replace('T', ' ')}${r.result ? ` · ${r.result}` : ''}`,
    cardMeta: r => [r.kind, r.follow_up_hcg_quantitative != null ? `hCG ${r.follow_up_hcg_quantitative}` : null],
  }} />;
}
