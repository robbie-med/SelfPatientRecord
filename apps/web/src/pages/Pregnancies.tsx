import CrudTool from '../components/CrudTool';
import { getPregnancies, createPregnancy, deletePregnancy, type Pregnancy } from '../api/client';

function gestationalWeeks(lmp?: string | null): string | null {
  if (!lmp) return null;
  const days = Math.floor((Date.now() - new Date(lmp).getTime()) / 86400000);
  if (days < 0 || days > 320) return null;
  return `${Math.floor(days / 7)}w${days % 7}d`;
}

export default function Pregnancies() {
  return <CrudTool<Pregnancy> config={{
    i18nBase: 'pages.pregnancies',
    queryKey: 'pregnancies',
    list: getPregnancies,
    create: createPregnancy,
    remove: deletePregnancy,
    fields: [
      { name: 'lmp_date', type: 'date' },
      { name: 'edd', type: 'date' },
      { name: 'conception_method', type: 'select', options: ['natural', 'iui', 'ivf', 'other'] },
      { name: 'status', type: 'select', options: ['active', 'completed', 'ended'] },
      { name: 'outcome', type: 'text' },
      { name: 'outcome_date', type: 'date' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.edd ? `EDD ${r.edd}` : (r.lmp_date ? `LMP ${r.lmp_date}` : (r.status ?? '')),
    cardMeta: r => [r.status, r.status === 'active' ? gestationalWeeks(r.lmp_date) : null, r.outcome],
  }} />;
}
