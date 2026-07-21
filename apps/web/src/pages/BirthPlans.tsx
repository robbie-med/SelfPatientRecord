import CrudTool from '../components/CrudTool';
import { getBirthPlans, createBirthPlan, deleteBirthPlan, type BirthPlan } from '../api/client';

export default function BirthPlans() {
  return <CrudTool<BirthPlan> config={{
    i18nBase: 'pages.birthPlans',
    queryKey: 'birth-plans',
    list: getBirthPlans,
    create: createBirthPlan,
    remove: deleteBirthPlan,
    fields: [
      { name: 'title', type: 'text', required: true, fullWidth: true },
      { name: 'finalized_at', type: 'date' },
      { name: 'plan_json', type: 'textarea' },
    ],
    cardTitle: r => r.title || 'Birth plan',
    cardMeta: r => [r.finalized_at ? `✓ ${r.finalized_at}` : null],
  }} />;
}
