import CrudTool from '../components/CrudTool';
import { getKickSessions, createKickSession, deleteKickSession, type KickSession } from '../api/client';

export default function KickCounter() {
  return <CrudTool<KickSession> config={{
    i18nBase: 'pages.kickCounter',
    queryKey: 'kick-sessions',
    list: getKickSessions,
    create: createKickSession,
    remove: deleteKickSession,
    fields: [
      { name: 'started_at', type: 'datetime', required: true },
      { name: 'ended_at', type: 'datetime' },
      { name: 'count', type: 'number' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${(r.started_at ?? '').slice(0, 16).replace('T', ' ')}${r.count != null ? ` · ${r.count}` : ''}`,
    cardMeta: r => [r.ended_at ? `→ ${r.ended_at.slice(11, 16)}` : null, r.notes],
  }} />;
}
