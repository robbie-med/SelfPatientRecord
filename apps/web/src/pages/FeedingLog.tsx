import CrudTool from '../components/CrudTool';
import { getFeedingEvents, createFeedingEvent, deleteFeedingEvent, type FeedingEvent } from '../api/client';

export default function FeedingLog() {
  return <CrudTool<FeedingEvent> config={{
    i18nBase: 'pages.feedingLog',
    queryKey: 'feeding-events',
    list: getFeedingEvents,
    create: createFeedingEvent,
    remove: deleteFeedingEvent,
    fields: [
      { name: 'started_at', type: 'datetime', required: true },
      { name: 'ended_at', type: 'datetime' },
      { name: 'kind', type: 'select', options: ['breast', 'bottle_breastmilk', 'formula', 'solid'] },
      { name: 'side', type: 'select', options: ['left', 'right', 'both'] },
      { name: 'volume_ml', type: 'number' },
      { name: 'notes', type: 'textarea' },
    ],
    cardTitle: r => `${(r.started_at ?? '').slice(0, 16).replace('T', ' ')}${r.kind ? ` · ${r.kind}` : ''}`,
    cardMeta: r => [r.side, r.volume_ml != null ? `${r.volume_ml} ml` : null],
  }} />;
}
