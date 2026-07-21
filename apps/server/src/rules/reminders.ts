import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

const STALENESS_MONTHS = 12;

export async function syncReminders(patientId: string): Promise<number> {
  const now = new Date().toISOString();

  const open = await db.select({
    id: schema.reminders.id,
    kind: schema.reminders.kind,
    target_entity_id: schema.reminders.target_entity_id,
    payload_json: schema.reminders.payload_json,
  }).from(schema.reminders)
    .where(and(
      eq(schema.reminders.patient_id, patientId),
      isNull(schema.reminders.dismissed_at),
      isNull(schema.reminders.completed_at),
    ));

  const hasGapReminder = new Set(
    open.filter(r => r.kind === 'overdue_screening').map(r => r.target_entity_id),
  );
  const stalePackCountries = new Set(
    open.filter(r => r.kind === 'guideline_staleness').map(r => {
      try { return (JSON.parse(r.payload_json ?? '{}') as { country?: string }).country; }
      catch { return null; }
    }),
  );

  const rows: (typeof schema.reminders.$inferInsert)[] = [];

  const gaps = await db.select().from(schema.care_gaps)
    .where(and(eq(schema.care_gaps.patient_id, patientId), eq(schema.care_gaps.status, 'open')));
  for (const gap of gaps) {
    if (hasGapReminder.has(gap.id)) continue;
    rows.push({
      id: uuid(),
      patient_id: patientId,
      kind: 'overdue_screening',
      title: gap.title,
      body: gap.description,
      target_entity_type: 'care_gap',
      target_entity_id: gap.id,
      prevention_category: gap.prevention_category ?? null,
      due_at: now,
      payload_json: JSON.stringify({ gap_type: gap.gap_type }),
      created_at: now,
      updated_at: now,
    });
  }

  const packs = await db.select().from(schema.guideline_packs);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - STALENESS_MONTHS);
  for (const pack of packs) {
    if (new Date(pack.last_reviewed) >= cutoff) continue;
    if (stalePackCountries.has(pack.country)) continue;
    rows.push({
      id: uuid(),
      patient_id: patientId,
      kind: 'guideline_staleness',
      title: `Guideline pack "${pack.country}" is out of date`,
      body: `The ${pack.country} guideline pack was last reviewed on ${pack.last_reviewed}, more than ${STALENESS_MONTHS} months ago. Recommendations may not reflect current guidance.`,
      target_entity_type: 'guideline_pack',
      target_entity_id: pack.country,
      due_at: now,
      payload_json: JSON.stringify({ country: pack.country, last_reviewed: pack.last_reviewed }),
      created_at: now,
      updated_at: now,
    });
  }

  if (rows.length) {
    await db.insert(schema.reminders).values(rows);
    console.log(`[reminders] Synced ${rows.length} reminder(s).`);
  }
  return rows.length;
}
