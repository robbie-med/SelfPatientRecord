import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { db, initDb } from './db/index.js';
import * as schema from './db/schema.js';
import { isAIEnabled } from './ai/client.js';
import { extractFromText } from './ai/extractor.js';
import { chatWithRecord } from './ai/chat.js';
import { evaluateModuleTriggers } from './rules/module-triggers.js';
import { seedGuidelines } from './rules/seed-guidelines.js';
import { detectCareGaps } from './rules/care-gaps.js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Hono();

app.use('*', cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ai_enabled: isAIEnabled() }));

// ── Patient ───────────────────────────────────────────────────────────────────
async function getOrCreatePatient() {
  const rows = await db.select().from(schema.patients).limit(1);
  if (rows.length > 0) return rows[0];

  const now = new Date().toISOString();
  const patient = {
    id: uuid(),
    legal_name: 'My Health Record',
    preferred_name: null as string | null,
    date_of_birth: null as string | null,
    sex_at_birth: 'unknown',
    gender_identity: null as string | null,
    pregnancy_capable: false,
    pregnancy_status: null as string | null,
    country_of_birth: 'US',
    current_country: 'US',
    preferred_language: 'en',
    secondary_languages: '[]',
    preferred_guideline_country: 'US',
    preferred_units: 'metric',
    preferred_date_format: 'YYYY-MM-DD',
    guideline_lens: JSON.stringify({
      default_country: 'US',
      comparison_countries: [],
      preferred_organizations: ['uspstf', 'cdc', 'ada', 'acog'],
      display_language: 'en',
      export_language: 'en',
      show_foreign_guidelines: false,
    }),
    created_at: now,
    updated_at: now,
  };
  await db.insert(schema.patients).values(patient);
  return patient;
}

app.get('/api/patient', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json({
      ...patient,
      secondary_languages: JSON.parse(patient.secondary_languages ?? '[]'),
      guideline_lens: JSON.parse(patient.guideline_lens ?? '{}'),
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/patient', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updated_at: now };
    const allowed = ['legal_name', 'preferred_name', 'date_of_birth', 'sex_at_birth', 'gender_identity',
      'pregnancy_capable', 'pregnancy_status', 'country_of_birth', 'current_country', 'preferred_language',
      'preferred_guideline_country', 'preferred_units', 'preferred_date_format'];

    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (body.secondary_languages) updates['secondary_languages'] = JSON.stringify(body.secondary_languages);
    if (body.guideline_lens) updates['guideline_lens'] = JSON.stringify(body.guideline_lens);

    await db.update(schema.patients).set(updates).where(eq(schema.patients.id, patient.id));
    const updated = await db.select().from(schema.patients).where(eq(schema.patients.id, patient.id)).limit(1);
    const row = updated[0];
    return c.json({
      ...row,
      secondary_languages: JSON.parse(row.secondary_languages ?? '[]'),
      guideline_lens: JSON.parse(row.guideline_lens ?? '{}'),
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Documents ─────────────────────────────────────────────────────────────────
app.get('/api/documents', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const rows = await db.select().from(schema.documents)
      .where(eq(schema.documents.patient_id, patient.id))
      .orderBy(desc(schema.documents.created_at));
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/documents', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const doc = {
      id: uuid(),
      patient_id: patient.id,
      title: body.title ?? 'Untitled Document',
      source_type: body.source_type ?? 'paste',
      raw_text: body.raw_text ?? '',
      document_type: body.document_type ?? 'other',
      encounter_date: body.encounter_date ?? null,
      facility: body.facility ?? null,
      provider: body.provider ?? null,
      extraction_status: 'pending',
      created_at: new Date().toISOString(),
    };
    await db.insert(schema.documents).values(doc);
    await db.insert(schema.audit_log).values({
      id: uuid(), patient_id: patient.id, action: 'created',
      entity_type: 'document', entity_id: doc.id,
      details: JSON.stringify({ title: doc.title }), ai_involved: false,
      created_at: new Date().toISOString(),
    });
    return c.json(doc, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/documents/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.documents).where(eq(schema.documents.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'Not found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/documents/:id', async (c) => {
  try {
    await db.delete(schema.documents).where(eq(schema.documents.id, c.req.param('id')));
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/documents/:id/extract', async (c) => {
  try {
    if (!isAIEnabled()) return c.json({ error: 'AI not enabled' }, 503);
    const docId = c.req.param('id');
    const rows = await db.select().from(schema.documents).where(eq(schema.documents.id, docId)).limit(1);
    if (!rows.length) return c.json({ error: 'Not found' }, 404);
    const doc = rows[0];

    await db.update(schema.documents).set({ extraction_status: 'processing' }).where(eq(schema.documents.id, docId));

    const result = await extractFromText(doc.raw_text ?? '');

    // Store extracted facts
    const factRows = [];
    for (const item of result.conditions) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'condition', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }
    for (const item of result.medications) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'medication', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }
    for (const item of result.labs) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'lab', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }
    for (const item of result.allergies) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'allergy', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }
    for (const item of result.vitals) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'vital', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }
    for (const item of result.imaging) {
      factRows.push({ id: uuid(), document_id: docId, fact_type: 'imaging', raw_data: JSON.stringify(item), source_quote: item.source_quote, confidence: item.confidence, user_confirmed: false, created_at: new Date().toISOString() });
    }

    if (factRows.length > 0) {
      await db.insert(schema.extracted_facts).values(factRows);
    }

    await db.update(schema.documents).set({ extraction_status: 'completed' }).where(eq(schema.documents.id, docId));

    return c.json({
      document_id: docId,
      ...result,
      fact_ids: factRows.map((f) => ({ id: f.id, fact_type: f.fact_type })),
    });
  } catch (e) {
    console.error(e);
    await db.update(schema.documents).set({ extraction_status: 'failed' }).where(eq(schema.documents.id, c.req.param('id')));
    return c.json({ error: 'Extraction failed' }, 500);
  }
});

app.get('/api/documents/:id/facts', async (c) => {
  try {
    const rows = await db.select().from(schema.extracted_facts)
      .where(eq(schema.extracted_facts.document_id, c.req.param('id')));
    return c.json(rows.map((r) => ({ ...r, raw_data: JSON.parse(r.raw_data) })));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/documents/:id/confirm', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json() as { confirmations: Array<{ fact_id: string; fact_type: string; confirmed: boolean; edited_data?: Record<string, unknown> }> };
    const now = new Date().toISOString();

    for (const conf of body.confirmations) {
      if (!conf.confirmed) {
        await db.update(schema.extracted_facts).set({ user_confirmed: false }).where(eq(schema.extracted_facts.id, conf.fact_id));
        continue;
      }

      await db.update(schema.extracted_facts).set({ user_confirmed: true }).where(eq(schema.extracted_facts.id, conf.fact_id));

      const factRows = await db.select().from(schema.extracted_facts).where(eq(schema.extracted_facts.id, conf.fact_id)).limit(1);
      if (!factRows.length) continue;
      const fact = factRows[0];
      const data = { ...JSON.parse(fact.raw_data), ...(conf.edited_data ?? {}) };

      if (conf.fact_type === 'condition') {
        await db.insert(schema.conditions).values({ id: uuid(), patient_id: patient.id, name: data.name, status: data.status ?? 'active', onset_date: data.date ?? null, source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now, updated_at: now });
      } else if (conf.fact_type === 'medication') {
        await db.insert(schema.medications).values({ id: uuid(), patient_id: patient.id, name: data.name, generic_name: data.generic_name ?? null, dose: data.dose ?? null, route: data.route ?? null, frequency: data.frequency ?? null, status: data.status ?? 'current', source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now, updated_at: now });
      } else if (conf.fact_type === 'lab') {
        const numericValue = parseFloat(data.value);
        await db.insert(schema.labs).values({ id: uuid(), patient_id: patient.id, test_name: data.test_name, value: data.value, numeric_value: isNaN(numericValue) ? null : numericValue, unit: data.unit ?? null, interpretation: data.interpretation ?? null, collection_date: data.date ?? now.split('T')[0], source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now });
      } else if (conf.fact_type === 'allergy') {
        await db.insert(schema.allergies).values({ id: uuid(), patient_id: patient.id, allergen: data.allergen, reaction: data.reaction ?? null, severity: data.severity ?? null, status: 'active', source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now });
      } else if (conf.fact_type === 'vital') {
        await db.insert(schema.vitals).values({ id: uuid(), patient_id: patient.id, vital_type: data.vital_type, value: data.value, unit: data.unit ?? null, recorded_at: data.date ?? now, source_document_id: fact.document_id, user_confirmed: true, created_at: now });
      } else if (conf.fact_type === 'imaging') {
        await db.insert(schema.imaging_reports).values({ id: uuid(), patient_id: patient.id, study_type: data.study_type, body_part: data.body_part ?? null, findings: data.findings, study_date: data.date ?? null, source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now });
      }
    }

    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Conditions ────────────────────────────────────────────────────────────────
app.get('/api/conditions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const status = c.req.query('status');
    const query = status
      ? db.select().from(schema.conditions).where(and(eq(schema.conditions.patient_id, patient.id), eq(schema.conditions.status, status)))
      : db.select().from(schema.conditions).where(eq(schema.conditions.patient_id, patient.id));
    return c.json(await query.orderBy(desc(schema.conditions.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/conditions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.conditions).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/conditions/:id', async (c) => {
  try {
    const body = await c.req.json();
    await db.update(schema.conditions).set({ ...body, updated_at: new Date().toISOString() }).where(eq(schema.conditions.id, c.req.param('id')));
    const rows = await db.select().from(schema.conditions).where(eq(schema.conditions.id, c.req.param('id'))).limit(1);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/conditions/:id', async (c) => {
  try {
    await db.delete(schema.conditions).where(eq(schema.conditions.id, c.req.param('id')));
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Medications ───────────────────────────────────────────────────────────────
app.get('/api/medications', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const status = c.req.query('status');
    const query = status
      ? db.select().from(schema.medications).where(and(eq(schema.medications.patient_id, patient.id), eq(schema.medications.status, status)))
      : db.select().from(schema.medications).where(eq(schema.medications.patient_id, patient.id));
    return c.json(await query.orderBy(desc(schema.medications.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/medications', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.medications).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/medications/:id', async (c) => {
  try {
    const body = await c.req.json();
    await db.update(schema.medications).set({ ...body, updated_at: new Date().toISOString() }).where(eq(schema.medications.id, c.req.param('id')));
    const rows = await db.select().from(schema.medications).where(eq(schema.medications.id, c.req.param('id'))).limit(1);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Labs ──────────────────────────────────────────────────────────────────────
app.get('/api/labs', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const testName = c.req.query('test_name');
    const query = testName
      ? db.select().from(schema.labs).where(and(eq(schema.labs.patient_id, patient.id), eq(schema.labs.test_name, testName)))
      : db.select().from(schema.labs).where(eq(schema.labs.patient_id, patient.id));
    return c.json(await query.orderBy(desc(schema.labs.collection_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/labs', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const numericValue = parseFloat(body.value);
    const row = { id: uuid(), patient_id: patient.id, ...body, numeric_value: isNaN(numericValue) ? null : numericValue, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.labs).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/labs/history/:testName', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const rows = await db.select().from(schema.labs)
      .where(and(eq(schema.labs.patient_id, patient.id), eq(schema.labs.test_name, decodeURIComponent(c.req.param('testName')))))
      .orderBy(schema.labs.collection_date);
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/labs/explain/:testName', (c) => {
  try {
    const testName = decodeURIComponent(c.req.param('testName')).toLowerCase().trim();
    const dataPath = path.resolve(__dirname, '../data/lab-explainers.json');
    const { tests } = JSON.parse(readFileSync(dataPath, 'utf-8')) as { tests: Array<{ aliases: string[]; [k: string]: unknown }> };
    const match = tests.find(t => t.aliases.some(a => testName.includes(a) || a.includes(testName)));
    if (!match) return c.json({ error: 'No explainer found for this test.' }, 404);
    return c.json(match);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Vitals ────────────────────────────────────────────────────────────────────
app.get('/api/vitals', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const type = c.req.query('type');
    const query = type
      ? db.select().from(schema.vitals).where(and(eq(schema.vitals.patient_id, patient.id), eq(schema.vitals.vital_type, type)))
      : db.select().from(schema.vitals).where(eq(schema.vitals.patient_id, patient.id));
    return c.json(await query.orderBy(desc(schema.vitals.recorded_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/vitals', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.vitals).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Allergies ─────────────────────────────────────────────────────────────────
app.get('/api/allergies', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.allergies).where(eq(schema.allergies.patient_id, patient.id)).orderBy(desc(schema.allergies.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/allergies', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.allergies).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/allergies/:id', async (c) => {
  try {
    await db.delete(schema.allergies).where(eq(schema.allergies.id, c.req.param('id')));
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Vaccines ──────────────────────────────────────────────────────────────────
app.get('/api/vaccines', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.vaccines).where(eq(schema.vaccines.patient_id, patient.id)).orderBy(desc(schema.vaccines.administered_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/vaccines', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.vaccines).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Encounters ────────────────────────────────────────────────────────────────
app.get('/api/encounters', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.encounters).where(eq(schema.encounters.patient_id, patient.id)).orderBy(desc(schema.encounters.encounter_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/encounters', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const row = { id: uuid(), patient_id: patient.id, ...body, diagnoses: JSON.stringify(body.diagnoses ?? []), user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.encounters).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Imaging ───────────────────────────────────────────────────────────────────
app.get('/api/imaging/explain/:term', (c) => {
  try {
    const term = decodeURIComponent(c.req.param('term')).toLowerCase().trim();
    const dataPath = path.resolve(__dirname, '../data/imaging-explainers.json');
    const { terms } = JSON.parse(readFileSync(dataPath, 'utf-8')) as { terms: Array<{ aliases: string[]; [k: string]: unknown }> };
    const match = terms.find(t => t.aliases.some(a => term.includes(a) || a.includes(term)));
    if (!match) return c.json({ error: 'No explainer found.' }, 404);
    return c.json(match);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/imaging', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.imaging_reports).where(eq(schema.imaging_reports.patient_id, patient.id)).orderBy(desc(schema.imaging_reports.study_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/imaging', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const body = await c.req.json();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.imaging_reports).values(row);
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Modules ───────────────────────────────────────────────────────────────────
const ALL_MODULES = [
  { id: 'diabetes', name: 'Diabetes Panel', description: 'A1c tracking, glucose trends, ADA guidelines.', icon: '🩸' },
  { id: 'prediabetes', name: 'Prediabetes / Metabolic Risk', description: 'A1c trend, prevention strategies.', icon: '⚠️' },
  { id: 'liver_health', name: 'Liver Health Panel', description: 'ALT/AST trends, hepatitis screening.', icon: '🫁' },
  { id: 'kidney_health', name: 'Kidney Health Panel', description: 'eGFR, creatinine, CKD monitoring.', icon: '🫘' },
  { id: 'pregnancy', name: 'Pregnancy Panel', description: 'Prenatal labs, BP, milestones.', icon: '🤰' },
  { id: 'thyroid', name: 'Thyroid Panel', description: 'TSH trends, thyroid med dosing.', icon: '🦋' },
  { id: 'dialysis', name: 'Dialysis Panel', description: 'Session tracking, access, labs.', icon: '💉' },
  { id: 'anticoagulation', name: 'Anticoagulation Panel', description: 'INR, anticoagulant safety.', icon: '💊' },
  { id: 'cardiac', name: 'Cardiac / Hypertension Panel', description: 'BP, lipids, ACC/AHA guidelines.', icon: '❤️' },
  { id: 'asthma_copd', name: 'Asthma / COPD Panel', description: 'Inhaler use, exacerbations.', icon: '🌬️' },
  { id: 'mental_health', name: 'Mental Health Panel', description: 'Mood tracking, medications.', icon: '🧠' },
  { id: 'cancer_history', name: 'Cancer Survivorship Panel', description: 'Follow-up tracking, monitoring.', icon: '🎗️' },
  { id: 'lipids', name: 'Lipid / Cholesterol Panel', description: 'LDL, HDL, statin tracking.', icon: '📊' },
  { id: 'osteoporosis', name: 'Bone Health Panel', description: 'DEXA, fracture risk, bisphosphonates.', icon: '🦴' },
];

app.get('/api/modules', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const statusRows = await db.select().from(schema.module_status).where(eq(schema.module_status.patient_id, patient.id));
    const statusMap = new Map(statusRows.map((r) => [r.module_id, r.status]));

    const [conds, meds, labRows] = await Promise.all([
      db.select().from(schema.conditions).where(eq(schema.conditions.patient_id, patient.id)),
      db.select().from(schema.medications).where(eq(schema.medications.patient_id, patient.id)),
      db.select().from(schema.labs).where(eq(schema.labs.patient_id, patient.id)),
    ]);

    const activeModuleIds = statusRows.filter((r) => r.status === 'on').map((r) => r.module_id);
    const suggestions = evaluateModuleTriggers({ conditions: conds, medications: meds, labs: labRows }, activeModuleIds);
    const suggestedIds = new Set(suggestions.map((s) => s.module_id));

    return c.json(ALL_MODULES.map((m) => ({
      ...m,
      status: statusMap.get(m.id) ?? (suggestedIds.has(m.id) ? 'suggested' : 'off'),
      trigger_reason: suggestions.find((s) => s.module_id === m.id)?.message,
    })));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/modules/:id/enable', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const moduleId = c.req.param('id');
    const now = new Date().toISOString();
    const existing = await db.select().from(schema.module_status).where(and(eq(schema.module_status.patient_id, patient.id), eq(schema.module_status.module_id, moduleId))).limit(1);
    if (existing.length) {
      await db.update(schema.module_status).set({ status: 'on', activated_at: now, updated_at: now }).where(eq(schema.module_status.id, existing[0].id));
    } else {
      await db.insert(schema.module_status).values({ id: uuid(), patient_id: patient.id, module_id: moduleId, status: 'on', activated_at: now, created_at: now, updated_at: now });
    }
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/modules/:id/disable', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const moduleId = c.req.param('id');
    const now = new Date().toISOString();
    const existing = await db.select().from(schema.module_status).where(and(eq(schema.module_status.patient_id, patient.id), eq(schema.module_status.module_id, moduleId))).limit(1);
    if (existing.length) {
      await db.update(schema.module_status).set({ status: 'off', updated_at: now }).where(eq(schema.module_status.id, existing[0].id));
    }
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Guidelines ────────────────────────────────────────────────────────────────
app.get('/api/guidelines', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const lens = JSON.parse(patient.guideline_lens ?? '{}');
    const defaultCountry = lens.default_country ?? 'US';
    const comparisonCountries: string[] = lens.comparison_countries ?? [];
    const allCountries = [defaultCountry, ...comparisonCountries];

    const recs = await db.select().from(schema.guideline_recommendations)
      .where(eq(schema.guideline_recommendations.is_active, true));

    const filtered = recs.filter((r) => allCountries.includes(r.country));

    const dob = patient.date_of_birth;
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    const sex = patient.sex_at_birth;

    return c.json(filtered.map((r) => {
      const sexOk = !r.sex_relevance || JSON.parse(r.sex_relevance).includes(sex) || JSON.parse(r.sex_relevance).includes('all');
      const ageOk = (!r.age_min || age === null || age >= r.age_min) && (!r.age_max || age === null || age <= r.age_max);
      const applicable = sexOk && ageOk;
      return {
        ...r,
        module_tags: JSON.parse(r.module_tags ?? '[]'),
        sex_relevance: JSON.parse(r.sex_relevance ?? '["male","female"]'),
        risk_factors: JSON.parse(r.risk_factors ?? '{}'),
        patient_status: applicable ? 'applicable' : (r.country === defaultCountry ? 'not_applicable' : 'comparison_only'),
        status: applicable ? 'informational' : 'not_applicable',
      };
    }));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Care Gaps ─────────────────────────────────────────────────────────────────
app.get('/api/care-gaps', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    await detectCareGaps(patient.id);
    const rows = await db.select().from(schema.care_gaps)
      .where(and(eq(schema.care_gaps.patient_id, patient.id), eq(schema.care_gaps.status, 'open')));
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/care-gaps/:id/dismiss', async (c) => {
  try {
    await db.update(schema.care_gaps).set({ status: 'dismissed', resolved_at: new Date().toISOString() }).where(eq(schema.care_gaps.id, c.req.param('id')));
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── AI Chat ───────────────────────────────────────────────────────────────────
app.get('/api/chat', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const rows = await db.select().from(schema.chat_messages).where(eq(schema.chat_messages.patient_id, patient.id)).orderBy(schema.chat_messages.created_at);
    return c.json(rows.map((r) => ({ ...r, citations: JSON.parse(r.citations ?? '[]') })));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/chat', async (c) => {
  try {
    if (!isAIEnabled()) return c.json({ error: 'AI not enabled' }, 503);
    const patient = await getOrCreatePatient();
    const body = await c.req.json() as { message: string; history?: Array<{ role: string; content: string }> };
    const now = new Date().toISOString();

    const [conds, meds, labRows, allergyRows] = await Promise.all([
      db.select().from(schema.conditions).where(and(eq(schema.conditions.patient_id, patient.id), eq(schema.conditions.status, 'active'))),
      db.select().from(schema.medications).where(and(eq(schema.medications.patient_id, patient.id), eq(schema.medications.status, 'current'))),
      db.select().from(schema.labs).where(eq(schema.labs.patient_id, patient.id)).orderBy(desc(schema.labs.collection_date)).limit(20),
      db.select().from(schema.allergies).where(eq(schema.allergies.patient_id, patient.id)),
    ]);

    const dob = patient.date_of_birth;
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined;

    const context = {
      age,
      sex_at_birth: patient.sex_at_birth ?? undefined,
      conditions: conds.map((c) => ({ name: c.name, status: c.status ?? 'active' })),
      medications: meds.map((m) => ({ name: m.name, dose: m.dose ?? undefined, frequency: m.frequency ?? undefined })),
      labs: labRows.map((l) => ({ test_name: l.test_name, value: l.value, unit: l.unit ?? undefined, collection_date: l.collection_date, interpretation: l.interpretation ?? undefined })),
      allergies: allergyRows.map((a) => ({ allergen: a.allergen, severity: a.severity ?? undefined })),
    };

    const history = (body.history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const result = await chatWithRecord(body.message, history, context);

    await db.insert(schema.chat_messages).values([
      { id: uuid(), patient_id: patient.id, role: 'user', content: body.message, citations: '[]', created_at: now },
      { id: uuid(), patient_id: patient.id, role: 'assistant', content: result.answer, citations: JSON.stringify(result.citations), created_at: new Date().toISOString() },
    ]);

    return c.json(result);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/chat', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    await db.delete(schema.chat_messages).where(eq(schema.chat_messages.patient_id, patient.id));
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Static (production) ───────────────────────────────────────────────────────
const staticDir = process.env.STATIC_DIR ?? path.resolve(__dirname, '../../web/dist');
if (existsSync(staticDir)) {
  app.use('/*', serveStatic({ root: staticDir }));
}

const port = parseInt(process.env.PORT ?? '3001');

async function startup() {
  initDb();
  await seedGuidelines();
  const patient = await getOrCreatePatient();
  await detectCareGaps(patient.id);
  console.log(`HealthBinder server starting on port ${port}`);
  console.log(`AI enabled: ${isAIEnabled()}`);
  serve({ fetch: app.fetch, port });
}

startup().catch(console.error);
