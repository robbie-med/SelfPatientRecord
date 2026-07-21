import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

const A1C_MIN_READINGS = 3;
const A1C_RISE_THRESHOLD = 0.3;
const BP_WINDOW_DAYS = 14;
const BP_DRIFT_THRESHOLD = 10;
const WEIGHT_WINDOW_DAYS = 30;
const WEIGHT_CHANGE_PCT = 5;
const INR_LOW = 2.0;
const INR_HIGH = 3.0;
const INR_WINDOW_DAYS = 30;
const INR_OOR_COUNT = 2;
const EGFR_DROP_PCT = 25;

interface TrendAlert {
  alert_key: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const num = (v: string | null | undefined) => {
  const n = parseFloat(v ?? '');
  return isNaN(n) ? null : n;
};

export async function detectTrends(patientId: string): Promise<number> {
  const labs = await db.select({
    test_name: schema.labs.test_name,
    value: schema.labs.value,
    collection_date: schema.labs.collection_date,
  }).from(schema.labs)
    .where(and(eq(schema.labs.patient_id, patientId), isNull(schema.labs.deleted_at)))
    .orderBy(desc(schema.labs.collection_date));

  const vitals = await db.select({
    vital_type: schema.vitals.vital_type,
    value: schema.vitals.value,
    recorded_at: schema.vitals.recorded_at,
  }).from(schema.vitals)
    .where(and(eq(schema.vitals.patient_id, patientId), isNull(schema.vitals.deleted_at)))
    .orderBy(desc(schema.vitals.recorded_at));

  const meds = await db.select({ name: schema.medications.name })
    .from(schema.medications)
    .where(and(eq(schema.medications.patient_id, patientId), eq(schema.medications.status, 'current'), isNull(schema.medications.deleted_at)));

  const alerts: TrendAlert[] = [];
  const byName = (re: RegExp) => labs.filter(l => re.test(l.test_name) && num(l.value) !== null);

  // A1c rising: latest minus earliest of last 3 readings
  const a1c = byName(/a1c|hba1c|hemoglobin a1c/i).slice(0, A1C_MIN_READINGS);
  if (a1c.length >= A1C_MIN_READINGS) {
    const latest = num(a1c[0].value)!;
    const earliest = num(a1c[a1c.length - 1].value)!;
    if (latest - earliest >= A1C_RISE_THRESHOLD) {
      alerts.push({
        alert_key: 'a1c_rising',
        title: 'A1c trending up',
        body: `Your A1c has risen from ${earliest}% (${a1c[a1c.length - 1].collection_date}) to ${latest}% (${a1c[0].collection_date}). Discuss this trend with your doctor.`,
        payload: { metric: 'a1c', from: earliest, to: latest },
      });
    }
  }

  // BP drift: rolling 14-day systolic mean vs prior 14-day mean
  const sys = vitals
    .filter(v => /systolic|blood pressure/i.test(v.vital_type))
    .map(v => ({ at: v.recorded_at, val: num(/(\d+)\s*[/]/.test(v.value) ? v.value.split('/')[0] : v.value) }))
    .filter(v => v.val !== null);
  if (sys.length >= 4) {
    const cutoff = daysAgo(BP_WINDOW_DAYS);
    const priorCutoff = daysAgo(BP_WINDOW_DAYS * 2);
    const recent = sys.filter(v => v.at >= cutoff).map(v => v.val!);
    const prior = sys.filter(v => v.at < cutoff && v.at >= priorCutoff).map(v => v.val!);
    if (recent.length >= 2 && prior.length >= 2) {
      const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
      const recentMean = mean(recent);
      const priorMean = mean(prior);
      if (recentMean - priorMean >= BP_DRIFT_THRESHOLD) {
        alerts.push({
          alert_key: 'bp_drift_up',
          title: 'Blood pressure drifting up',
          body: `Your average systolic BP over the last ${BP_WINDOW_DAYS} days (${Math.round(recentMean)}) is up ${Math.round(recentMean - priorMean)} points from the prior period (${Math.round(priorMean)}).`,
          payload: { metric: 'systolic_bp', recent_mean: recentMean, prior_mean: priorMean },
        });
      }
    }
  }

  // Weight change > 5% in 30 days
  const weights = vitals
    .filter(v => /weight/i.test(v.vital_type))
    .map(v => ({ at: v.recorded_at, val: num(v.value) }))
    .filter(v => v.val !== null);
  if (weights.length >= 2) {
    const cutoff = daysAgo(WEIGHT_WINDOW_DAYS);
    const recent = weights.filter(v => v.at >= cutoff);
    const older = weights.filter(v => v.at < cutoff);
    if (recent.length && older.length) {
      const latest = recent[0].val!;
      const ref = older[0].val!;
      const pct = Math.abs(latest - ref) / ref * 100;
      if (pct >= WEIGHT_CHANGE_PCT) {
        const dir = latest > ref ? 'gained' : 'lost';
        alerts.push({
          alert_key: 'weight_change',
          title: `Rapid weight ${dir === 'gained' ? 'gain' : 'loss'}`,
          body: `Your weight changed ${pct.toFixed(1)}% (from ${ref} to ${latest}) within about ${WEIGHT_WINDOW_DAYS} days. Unintentional rapid changes are worth discussing with your doctor.`,
          payload: { metric: 'weight', from: ref, to: latest, pct },
        });
      }
    }
  }

  // INR out of range twice in 30 days while on warfarin
  const onWarfarin = meds.some(m => /warfarin|coumadin/i.test(m.name));
  if (onWarfarin) {
    const inr = byName(/\binr\b|prothrombin|pt\/inr/i)
      .filter(l => l.collection_date >= daysAgo(INR_WINDOW_DAYS).split('T')[0]);
    const oor = inr.filter(l => {
      const v = num(l.value)!;
      return v < INR_LOW || v > INR_HIGH;
    });
    if (oor.length >= INR_OOR_COUNT) {
      alerts.push({
        alert_key: 'inr_out_of_range',
        title: 'INR out of range repeatedly',
        body: `${oor.length} INR results in the last ${INR_WINDOW_DAYS} days were outside the usual ${INR_LOW}–${INR_HIGH} target range for warfarin. Contact your anticoagulation clinic or doctor.`,
        payload: { metric: 'inr', out_of_range: oor.map(l => ({ date: l.collection_date, value: l.value })) },
      });
    }
  }

  // eGFR drop ≥ 25% from baseline (earliest recorded)
  const egfr = byName(/egfr|glomerular/i);
  if (egfr.length >= 2) {
    const latest = num(egfr[0].value)!;
    const baseline = num(egfr[egfr.length - 1].value)!;
    if (baseline > 0 && (baseline - latest) / baseline * 100 >= EGFR_DROP_PCT) {
      alerts.push({
        alert_key: 'egfr_declining',
        title: 'Kidney function (eGFR) declining',
        body: `Your eGFR has fallen from ${baseline} (${egfr[egfr.length - 1].collection_date}) to ${latest} (${egfr[0].collection_date}) — a drop of more than ${EGFR_DROP_PCT}%. Discuss kidney function with your doctor.`,
        payload: { metric: 'egfr', from: baseline, to: latest },
      });
    }
  }

  if (!alerts.length) return 0;

  const existing = await db.select({ payload_json: schema.reminders.payload_json })
    .from(schema.reminders)
    .where(and(
      eq(schema.reminders.patient_id, patientId),
      eq(schema.reminders.kind, 'trend_alert'),
      isNull(schema.reminders.dismissed_at),
      isNull(schema.reminders.completed_at),
    ));
  const openKeys = new Set(existing.map(r => {
    try { return (JSON.parse(r.payload_json ?? '{}') as { alert_key?: string }).alert_key; }
    catch { return null; }
  }));

  const now = new Date().toISOString();
  const fresh = alerts.filter(a => !openKeys.has(a.alert_key));
  if (fresh.length) {
    await db.insert(schema.reminders).values(fresh.map(a => ({
      id: uuid(),
      patient_id: patientId,
      kind: 'trend_alert',
      title: a.title,
      body: a.body,
      target_entity_type: 'lab',
      due_at: now,
      payload_json: JSON.stringify({ ...a.payload, alert_key: a.alert_key }),
      created_at: now,
      updated_at: now,
    })));
    console.log(`[trends] Created ${fresh.length} trend alert(s): ${fresh.map(a => a.alert_key).join(', ')}`);
  }
  return fresh.length;
}
