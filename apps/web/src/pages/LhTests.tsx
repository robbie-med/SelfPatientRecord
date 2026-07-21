import CrudTool from '../components/CrudTool';
import { getLhTests, createLhTest, deleteLhTest, type LhTest } from '../api/client';

export default function LhTests() {
  return <CrudTool<LhTest> config={{
    i18nBase: 'pages.lhTests',
    queryKey: 'lh-tests',
    list: getLhTests,
    create: createLhTest,
    remove: deleteLhTest,
    fields: [
      { name: 'taken_at', type: 'datetime', required: true },
      { name: 'result', type: 'select', options: ['negative', 'positive', 'peak'] },
      { name: 'intensity', type: 'number' },
      { name: 'brand', type: 'text' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${(r.taken_at ?? '').slice(0, 16).replace('T', ' ')}${r.result ? ` · ${r.result}` : ''}`,
    cardMeta: r => [r.intensity != null ? `intensity ${r.intensity}` : null, r.brand],
  }} />;
}
