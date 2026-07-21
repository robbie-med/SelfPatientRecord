import CrudTool from '../components/CrudTool';
import { getDialysisSessions, createDialysisSession, deleteDialysisSession, type DialysisSession } from '../api/client';

export default function DialysisSessions() {
  return <CrudTool<DialysisSession> config={{
    i18nBase: 'pages.dialysis',
    queryKey: 'dialysis-sessions',
    list: getDialysisSessions,
    create: createDialysisSession,
    remove: deleteDialysisSession,
    fields: [
      { name: 'session_date', type: 'date', required: true },
      { name: 'duration_min', type: 'number' },
      { name: 'access_site', type: 'text' },
      { name: 'pre_weight', type: 'number' },
      { name: 'post_weight', type: 'number' },
      { name: 'uf_goal', type: 'number' },
      { name: 'uf_achieved', type: 'number' },
      { name: 'complications_text', type: 'textarea' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => r.session_date,
    cardMeta: r => [
      r.duration_min != null ? `${r.duration_min} min` : null,
      r.access_site,
      r.pre_weight != null && r.post_weight != null ? `${r.pre_weight} → ${r.post_weight} kg` : null,
    ],
  }} />;
}
