import CrudTool from '../components/CrudTool';
import { getMoodEntries, createMoodEntry, deleteMoodEntry, type MoodEntry } from '../api/client';

export default function MoodJournal() {
  return <CrudTool<MoodEntry> config={{
    i18nBase: 'pages.mood',
    queryKey: 'mood-entries',
    list: getMoodEntries,
    create: createMoodEntry,
    remove: deleteMoodEntry,
    fields: [
      { name: 'logged_at', type: 'datetime', required: true },
      { name: 'mood_score', type: 'number' },
      { name: 'energy_score', type: 'number' },
      { name: 'anxiety_score', type: 'number' },
      { name: 'irritability_score', type: 'number' },
      { name: 'notes_markdown', type: 'textarea' },
    ],
    cardTitle: r => `${(r.logged_at ?? '').slice(0, 16).replace('T', ' ')}${r.mood_score != null ? ` · ${r.mood_score}/10` : ''}`,
    cardMeta: r => [
      r.energy_score != null ? `⚡${r.energy_score}` : null,
      r.anxiety_score != null ? `😰${r.anxiety_score}` : null,
      r.irritability_score != null ? `😤${r.irritability_score}` : null,
      r.notes_markdown,
    ],
  }} />;
}
