import CrudTool from '../components/CrudTool';
import { getScreeningResponses, createScreeningResponse, deleteScreeningResponse, type ScreeningResponse } from '../api/client';

export default function Screenings() {
  return <CrudTool<ScreeningResponse> config={{
    i18nBase: 'pages.screenings',
    queryKey: 'screening-responses',
    list: getScreeningResponses,
    create: createScreeningResponse,
    remove: deleteScreeningResponse,
    fields: [
      { name: 'instrument', type: 'select', required: true, options: ['EPDS', 'PHQ-9', 'GAD-7'] },
      { name: 'completed_at', type: 'date', required: true },
      { name: 'total_score', type: 'number' },
      { name: 'interpretation', type: 'text' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${r.instrument}${r.total_score != null ? ` — ${r.total_score}` : ''}`,
    cardMeta: r => [r.completed_at, r.interpretation],
  }} />;
}
