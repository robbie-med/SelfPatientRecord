import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getEncounters, getConditions, type Encounter, type Condition } from '../api/client';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

type EventType = 'encounter' | 'condition';
interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  subtitle?: string;
  subtype?: string;
  detail?: string;
}

const ENCOUNTER_ICONS: Record<string, string> = {
  office_visit: '🏥', emergency: '🚨', hospitalization: '🛏️',
  urgent_care: '⚡', telehealth: '💻', procedure: '🔬', other: '📋',
};

const FILTER_OPTIONS = ['all', 'encounters', 'conditions'] as const;
type Filter = typeof FILTER_OPTIONS[number];

export default function Timeline() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: encounters = [] } = useQuery({ queryKey: ['encounters'], queryFn: getEncounters });
  const { data: conditions = [] } = useQuery({ queryKey: ['conditions'], queryFn: () => getConditions() });

  const events: TimelineEvent[] = [];

  if (filter === 'all' || filter === 'encounters') {
    encounters.forEach((e: Encounter) => {
      events.push({
        id: e.id,
        date: e.encounter_date,
        type: 'encounter',
        title: t(`timeline.types.${e.encounter_type}` as Parameters<typeof t>[0]) || e.encounter_type,
        subtitle: [e.facility, e.provider].filter(Boolean).join(' · '),
        subtype: e.encounter_type,
        detail: e.chief_complaint ?? e.assessment ?? undefined,
      });
    });
  }

  if (filter === 'all' || filter === 'conditions') {
    conditions.forEach((c: Condition) => {
      if (c.onset_date) {
        events.push({
          id: `c-${c.id}`,
          date: c.onset_date,
          type: 'condition',
          title: c.name,
          subtitle: c.status,
          subtype: c.status,
        });
      }
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));

  // Group by year-month
  const grouped = events.reduce<Record<string, TimelineEvent[]>>((acc, ev) => {
    const key = ev.date.slice(0, 7);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatMonth = (key: string) => {
    try { return format(parseISO(`${key}-01`), 'MMMM yyyy'); } catch { return key; }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('timeline.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('timeline.description')}</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx('text-sm px-3 py-1.5 rounded-lg border transition-colors', filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}
          >
            {t(`timeline.filter.${f}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {!events.length && (
        <p className="text-sm text-gray-400 text-center py-12">{t('timeline.noEvents')}</p>
      )}

      <div className="space-y-8">
        {months.map(month => (
          <div key={month}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {formatMonth(month)}
            </div>
            <div className="space-y-3">
              {grouped[month].map(ev => (
                <div key={ev.id} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0',
                      ev.type === 'encounter' ? 'bg-blue-100' : 'bg-amber-100'
                    )}>
                      {ev.type === 'encounter' ? (ENCOUNTER_ICONS[ev.subtype ?? ''] ?? '📋') : '🩺'}
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-2" />
                  </div>
                  {/* Content */}
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex-1 min-w-0 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ev.title}</div>
                        {ev.subtitle && <div className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</div>}
                        {ev.detail && <div className="text-xs text-gray-400 mt-1 italic">{ev.detail}</div>}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {(() => { try { return format(parseISO(ev.date), 'MMM d'); } catch { return ev.date; } })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
