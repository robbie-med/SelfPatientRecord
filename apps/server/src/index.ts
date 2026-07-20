import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { v4 as uuid } from 'uuid';
import { eq, desc, and, lt, isNull, SQL } from 'drizzle-orm';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function pageParams(c: { req: { query: (k: string) => string | undefined } }) {
  const limitRaw = parseInt(c.req.query('limit') ?? '', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const cursor = c.req.query('cursor') ?? null;
  return { limit, cursor };
}

function nextCursor<T>(rows: T[], limit: number, getKey: (row: T) => string | null | undefined): string | null {
  if (rows.length < limit) return null;
  const last = rows[rows.length - 1];
  const key = getKey(last);
  return key ?? null;
}
import { db, initDb } from './db/index.js';
import * as schema from './db/schema.js';
import { audit } from './db/audit.js';
import {
  parseBody,
  documentCreateSchema, documentConfirmSchema,
  conditionCreateSchema, conditionUpdateSchema,
  medicationCreateSchema, medicationUpdateSchema,
  labCreateSchema, vitalCreateSchema, allergyCreateSchema,
  vaccineCreateSchema, encounterCreateSchema, imagingCreateSchema,
  patientUpdateSchema, aiConfigUpdateSchema, chatRequestSchema,
  supplementCreateSchema, supplementUpdateSchema,
  illnessCreateSchema, illnessUpdateSchema,
  medAdminCreateSchema, medAdminUpdateSchema,
  attachmentUpdateSchema,
  reminderCreateSchema, reminderUpdateSchema, reminderSnoozeSchema,
  surgeryCreateSchema, surgeryUpdateSchema,
  implantCreateSchema, implantUpdateSchema,
  equipmentCreateSchema, equipmentUpdateSchema,
  sensitivityCreateSchema, sensitivityUpdateSchema,
  sexEventCreateSchema, sexEventUpdateSchema,
  pregnancyOutcomeCreateSchema, pregnancyOutcomeUpdateSchema,
  ultrasoundCreateSchema, ultrasoundUpdateSchema,
  micronutrientCreateSchema, micronutrientUpdateSchema,
  accessDeviceCreateSchema, accessDeviceUpdateSchema,
  kickSessionCreateSchema, kickSessionUpdateSchema,
  contractionCreateSchema, contractionUpdateSchema,
  pregnancyCreateSchema, pregnancyUpdateSchema,
  screeningResponseCreateSchema, screeningResponseUpdateSchema,
  birthPlanCreateSchema, birthPlanUpdateSchema,
  feedingEventCreateSchema, feedingEventUpdateSchema,
  jaundiceCreateSchema, jaundiceUpdateSchema,
  dialysisCreateSchema, dialysisUpdateSchema,
  cycleCreateSchema, cycleUpdateSchema,
  cycleDayCreateSchema, cycleDayUpdateSchema,
  lhTestCreateSchema, lhTestUpdateSchema,
  pregnancyTestCreateSchema, pregnancyTestUpdateSchema,
  moodEntryCreateSchema, moodEntryUpdateSchema,
  experimentCreateSchema, experimentUpdateSchema,
} from './db/validators.js';
import { AIConfig, envFallbackConfig } from './ai/client.js';
import { extractFromText } from './ai/extractor.js';
import { chatWithRecord } from './ai/chat.js';
import { evaluateModuleTriggers } from './rules/module-triggers.js';
import { seedGuidelines } from './rules/seed-guidelines.js';
import { detectCareGaps } from './rules/care-gaps.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Hono();

const ALLOWED_ORIGINS = ['http://localhost:3901', 'http://127.0.0.1:3901', 'http://localhost:3104', 'http://127.0.0.1:3104'];
app.use('*', cors({ origin: ALLOWED_ORIGINS }));

// Multipart POSTs are CORS "simple requests" (no preflight), so any web page the
// user has open could blindly write to this unauthenticated localhost API.
// Reject state-changing requests whose Origin is present and not ours.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return c.json({ error: 'forbidden_origin' }, 403);
    }
  }
  await next();
});

// ── AI config ─────────────────────────────────────────────────────────────────
async function getAIConfig(): Promise<AIConfig> {
  const rows = await db.select().from(schema.ai_config).limit(1);
  if (rows.length > 0 && rows[0].api_key) {
    return {
      enabled: rows[0].enabled ?? false,
      provider: rows[0].provider ?? 'ppq',
      baseUrl: rows[0].base_url ?? 'https://api.ppq.ai/v1',
      apiKey: rows[0].api_key,
      extractionModel: rows[0].extraction_model ?? 'anthropic/claude-3.5-haiku',
      chatModel: rows[0].chat_model ?? 'anthropic/claude-3.5-haiku',
    };
  }
  return envFallbackConfig();
}

app.get('/api/ai-config', async (c) => {
  try {
    const rows = await db.select().from(schema.ai_config).limit(1);
    if (rows.length > 0) {
      const row = rows[0];
      return c.json({
        enabled: row.enabled ?? false,
        provider: row.provider ?? 'ppq',
        base_url: row.base_url ?? 'https://api.ppq.ai/v1',
        api_key_set: !!row.api_key,
        extraction_model: row.extraction_model ?? 'anthropic/claude-3.5-haiku',
        chat_model: row.chat_model ?? 'anthropic/claude-3.5-haiku',
      });
    }
    const fb = envFallbackConfig();
    return c.json({
      enabled: fb.enabled,
      provider: fb.provider,
      base_url: fb.baseUrl,
      api_key_set: !!fb.apiKey,
      extraction_model: fb.extractionModel,
      chat_model: fb.chatModel,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/ai-config', async (c) => {
  try {
    const parsed = await parseBody(c, aiConfigUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const rows = await db.select().from(schema.ai_config).limit(1);

    if (rows.length > 0) {
      const updates: Record<string, unknown> = { updated_at: now };
      if (body.enabled !== undefined) updates['enabled'] = body.enabled;
      if (body.provider !== undefined) updates['provider'] = body.provider;
      if (body.base_url !== undefined) updates['base_url'] = body.base_url;
      if (body.extraction_model !== undefined) updates['extraction_model'] = body.extraction_model;
      if (body.chat_model !== undefined) updates['chat_model'] = body.chat_model;
      if (body.api_key) updates['api_key'] = body.api_key;
      await db.update(schema.ai_config).set(updates).where(eq(schema.ai_config.id, rows[0].id));
    } else {
      await db.insert(schema.ai_config).values({
        id: 'singleton',
        enabled: body.enabled ?? false,
        provider: body.provider ?? 'ppq',
        base_url: body.base_url ?? 'https://api.ppq.ai/v1',
        api_key: body.api_key ?? null,
        extraction_model: body.extraction_model ?? 'anthropic/claude-3.5-haiku',
        chat_model: body.chat_model ?? 'anthropic/claude-3.5-haiku',
        updated_at: now,
      });
    }

    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (c) => {
  const config = await getAIConfig();
  return c.json({ status: 'ok', ai_enabled: config.enabled });
});

app.get('/api/_health', async (c) => {
  const startedAt = Date.now();
  const status: Record<string, unknown> = {
    status: 'ok',
    version: '0.1.0',
    checked_at: new Date().toISOString(),
  };

  try {
    const patientCount = await db.select().from(schema.patients);
    status.db = { ok: true, patients: patientCount.length };
  } catch (e) {
    status.db = { ok: false, error: (e as Error).message };
    status.status = 'degraded';
  }

  try {
    const config = await getAIConfig();
    status.ai = {
      enabled: config.enabled,
      provider: config.provider,
      model: config.chatModel,
      key_set: !!config.apiKey,
    };
  } catch (e) {
    status.ai = { ok: false, error: (e as Error).message };
  }

  try {
    const packs = await db.select().from(schema.guideline_packs);
    const recs = await db.select().from(schema.guideline_recommendations);
    const latestSeed = packs.reduce<string | null>((acc, p) => {
      if (!acc || (p.seeded_at && p.seeded_at > acc)) return p.seeded_at;
      return acc;
    }, null);
    status.guidelines = {
      pack_count: packs.length,
      recommendation_count: recs.length,
      last_seeded_at: latestSeed,
    };
  } catch (e) {
    status.guidelines = { ok: false, error: (e as Error).message };
  }

  status.response_ms = Date.now() - startedAt;
  return c.json(status);
});

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
    const parsed = await parseBody(c, patientUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
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
    const { limit, cursor } = pageParams(c);
    const conds: SQL[] = [eq(schema.documents.patient_id, patient.id), isNull(schema.documents.deleted_at)];
    if (cursor) conds.push(lt(schema.documents.created_at, cursor));
    const rows = await db.select().from(schema.documents)
      .where(and(...conds))
      .orderBy(desc(schema.documents.created_at))
      .limit(limit);
    const paginated = c.req.query('cursor') !== undefined || c.req.query('limit') !== undefined;
    if (paginated) {
      return c.json({ items: rows, next_cursor: nextCursor(rows, limit, (r) => r.created_at) });
    }
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/documents', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, documentCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
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
    await audit({ patientId: patient.id, action: 'created', entityType: 'document', entityId: doc.id, details: { title: doc.title }, diff: { after: doc as unknown as Record<string, unknown> } });
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
    const id = c.req.param('id');
    const existing = await db.select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.documents).set({ deleted_at: now }).where(eq(schema.documents.id, id));
    await audit({ patientId: existing[0]?.patient_id ?? null, action: 'deleted', entityType: 'document', entityId: id, diff: { before: existing[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/documents/:id/extract', async (c) => {
  try {
    const config = await getAIConfig();
    if (!config.enabled) return c.json({ error: 'AI not enabled' }, 503);
    const docId = c.req.param('id');
    const rows = await db.select().from(schema.documents).where(eq(schema.documents.id, docId)).limit(1);
    if (!rows.length) return c.json({ error: 'Not found' }, 404);
    const doc = rows[0];

    await db.update(schema.documents).set({ extraction_status: 'processing' }).where(eq(schema.documents.id, docId));

    const result = await extractFromText(doc.raw_text ?? '', config);

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
    const parsed = await parseBody(c, documentConfirmSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
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

      const newId = uuid();
      let entityType: string | null = null;
      let row: Record<string, unknown> | null = null;

      if (conf.fact_type === 'condition') {
        row = { id: newId, patient_id: patient.id, name: data.name, status: data.status ?? 'active', onset_date: data.date ?? null, source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now, updated_at: now };
        await db.insert(schema.conditions).values(row as typeof schema.conditions.$inferInsert);
        entityType = 'condition';
      } else if (conf.fact_type === 'medication') {
        row = { id: newId, patient_id: patient.id, name: data.name, generic_name: data.generic_name ?? null, dose: data.dose ?? null, route: data.route ?? null, frequency: data.frequency ?? null, status: data.status ?? 'current', source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now, updated_at: now };
        await db.insert(schema.medications).values(row as typeof schema.medications.$inferInsert);
        entityType = 'medication';
      } else if (conf.fact_type === 'lab') {
        const numericValue = parseFloat(data.value);
        row = { id: newId, patient_id: patient.id, test_name: data.test_name, value: data.value, numeric_value: isNaN(numericValue) ? null : numericValue, unit: data.unit ?? null, interpretation: data.interpretation ?? null, collection_date: data.date ?? now.split('T')[0], source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now };
        await db.insert(schema.labs).values(row as typeof schema.labs.$inferInsert);
        entityType = 'lab';
      } else if (conf.fact_type === 'allergy') {
        row = { id: newId, patient_id: patient.id, allergen: data.allergen, reaction: data.reaction ?? null, severity: data.severity ?? null, status: 'active', source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now };
        await db.insert(schema.allergies).values(row as typeof schema.allergies.$inferInsert);
        entityType = 'allergy';
      } else if (conf.fact_type === 'vital') {
        row = { id: newId, patient_id: patient.id, vital_type: data.vital_type, value: data.value, unit: data.unit ?? null, recorded_at: data.date ?? now, source_document_id: fact.document_id, user_confirmed: true, created_at: now };
        await db.insert(schema.vitals).values(row as typeof schema.vitals.$inferInsert);
        entityType = 'vital';
      } else if (conf.fact_type === 'imaging') {
        row = { id: newId, patient_id: patient.id, study_type: data.study_type, body_part: data.body_part ?? null, findings: data.findings, study_date: data.date ?? null, source_document_id: fact.document_id, source_quote: fact.source_quote ?? null, user_confirmed: true, created_at: now };
        await db.insert(schema.imaging_reports).values(row as typeof schema.imaging_reports.$inferInsert);
        entityType = 'imaging';
      }

      if (entityType && row) {
        await audit({ patientId: patient.id, action: 'confirmed', entityType, entityId: newId, details: { fact_id: conf.fact_id, document_id: fact.document_id }, diff: { after: row }, aiInvolved: true });
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
    const conds: SQL[] = [eq(schema.conditions.patient_id, patient.id), isNull(schema.conditions.deleted_at)];
    if (status) conds.push(eq(schema.conditions.status, status));
    return c.json(await db.select().from(schema.conditions).where(and(...conds)).orderBy(desc(schema.conditions.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/conditions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, conditionCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.conditions).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'condition', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/conditions/:id', async (c) => {
  try {
    const parsed = await parseBody(c, conditionUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const id = c.req.param('id');
    const before = await db.select().from(schema.conditions).where(eq(schema.conditions.id, id)).limit(1);
    await db.update(schema.conditions).set({ ...body, updated_at: new Date().toISOString() }).where(eq(schema.conditions.id, id));
    const rows = await db.select().from(schema.conditions).where(eq(schema.conditions.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'condition', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: rows[0] as unknown as Record<string, unknown> } });
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/conditions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.conditions).where(eq(schema.conditions.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.conditions).set({ deleted_at: now, updated_at: now }).where(eq(schema.conditions.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'condition', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
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
    const conds: SQL[] = [eq(schema.medications.patient_id, patient.id), isNull(schema.medications.deleted_at)];
    if (status) conds.push(eq(schema.medications.status, status));
    return c.json(await db.select().from(schema.medications).where(and(...conds)).orderBy(desc(schema.medications.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/medications', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, medicationCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.medications).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'medication', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/medications/:id', async (c) => {
  try {
    const parsed = await parseBody(c, medicationUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const id = c.req.param('id');
    const before = await db.select().from(schema.medications).where(eq(schema.medications.id, id)).limit(1);
    await db.update(schema.medications).set({ ...body, updated_at: new Date().toISOString() }).where(eq(schema.medications.id, id));
    const rows = await db.select().from(schema.medications).where(eq(schema.medications.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'medication', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: rows[0] as unknown as Record<string, unknown> } });
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
    const { limit, cursor } = pageParams(c);
    const conds: SQL[] = [eq(schema.labs.patient_id, patient.id), isNull(schema.labs.deleted_at)];
    if (testName) conds.push(eq(schema.labs.test_name, testName));
    if (cursor) conds.push(lt(schema.labs.collection_date, cursor));
    const rows = await db.select().from(schema.labs)
      .where(and(...conds))
      .orderBy(desc(schema.labs.collection_date))
      .limit(limit);
    const paginated = c.req.query('cursor') !== undefined || c.req.query('limit') !== undefined;
    if (paginated) {
      return c.json({ items: rows, next_cursor: nextCursor(rows, limit, (r) => r.collection_date) });
    }
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/labs', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, labCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const numericValue = parseFloat(body.value);
    const row = { id: uuid(), patient_id: patient.id, ...body, numeric_value: isNaN(numericValue) ? null : numericValue, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.labs).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'lab', entityId: row.id, diff: { after: row as Record<string, unknown> } });
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
      .where(and(eq(schema.labs.patient_id, patient.id), eq(schema.labs.test_name, decodeURIComponent(c.req.param('testName'))), isNull(schema.labs.deleted_at)))
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
    const { limit, cursor } = pageParams(c);
    const conds: SQL[] = [eq(schema.vitals.patient_id, patient.id), isNull(schema.vitals.deleted_at)];
    if (type) conds.push(eq(schema.vitals.vital_type, type));
    if (cursor) conds.push(lt(schema.vitals.recorded_at, cursor));
    const rows = await db.select().from(schema.vitals)
      .where(and(...conds))
      .orderBy(desc(schema.vitals.recorded_at))
      .limit(limit);
    const paginated = c.req.query('cursor') !== undefined || c.req.query('limit') !== undefined;
    if (paginated) {
      return c.json({ items: rows, next_cursor: nextCursor(rows, limit, (r) => r.recorded_at) });
    }
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/vitals', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, vitalCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.vitals).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'vital', entityId: row.id, diff: { after: row as Record<string, unknown> } });
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
    return c.json(await db.select().from(schema.allergies).where(and(eq(schema.allergies.patient_id, patient.id), isNull(schema.allergies.deleted_at))).orderBy(desc(schema.allergies.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/allergies', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, allergyCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.allergies).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'allergy', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/allergies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.allergies).where(eq(schema.allergies.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.allergies).set({ deleted_at: now }).where(eq(schema.allergies.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'allergy', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
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
    return c.json(await db.select().from(schema.vaccines).where(and(eq(schema.vaccines.patient_id, patient.id), isNull(schema.vaccines.deleted_at))).orderBy(desc(schema.vaccines.administered_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/vaccines', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, vaccineCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.vaccines).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'vaccine', entityId: row.id, diff: { after: row as Record<string, unknown> } });
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
    const { limit, cursor } = pageParams(c);
    const conds: SQL[] = [eq(schema.encounters.patient_id, patient.id), isNull(schema.encounters.deleted_at)];
    if (cursor) conds.push(lt(schema.encounters.encounter_date, cursor));
    const rows = await db.select().from(schema.encounters)
      .where(and(...conds))
      .orderBy(desc(schema.encounters.encounter_date))
      .limit(limit);
    const paginated = c.req.query('cursor') !== undefined || c.req.query('limit') !== undefined;
    if (paginated) {
      return c.json({ items: rows, next_cursor: nextCursor(rows, limit, (r) => r.encounter_date) });
    }
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/encounters', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, encounterCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const row = { id: uuid(), patient_id: patient.id, ...body, diagnoses: JSON.stringify(body.diagnoses ?? []), user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.encounters).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'encounter', entityId: row.id, diff: { after: row as Record<string, unknown> } });
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
    return c.json(await db.select().from(schema.imaging_reports).where(and(eq(schema.imaging_reports.patient_id, patient.id), isNull(schema.imaging_reports.deleted_at))).orderBy(desc(schema.imaging_reports.study_date)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/imaging', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, imagingCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: new Date().toISOString() };
    await db.insert(schema.imaging_reports).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'imaging', entityId: row.id, diff: { after: row as Record<string, unknown> } });
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
      db.select().from(schema.conditions).where(and(eq(schema.conditions.patient_id, patient.id), isNull(schema.conditions.deleted_at))),
      db.select().from(schema.medications).where(and(eq(schema.medications.patient_id, patient.id), isNull(schema.medications.deleted_at))),
      db.select().from(schema.labs).where(and(eq(schema.labs.patient_id, patient.id), isNull(schema.labs.deleted_at))),
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
    await audit({ patientId: patient.id, action: 'enabled', entityType: 'module', entityId: moduleId });
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
    await audit({ patientId: patient.id, action: 'disabled', entityType: 'module', entityId: moduleId });
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
    const id = c.req.param('id');
    const before = await db.select().from(schema.care_gaps).where(eq(schema.care_gaps.id, id)).limit(1);
    await db.update(schema.care_gaps).set({ status: 'dismissed', resolved_at: new Date().toISOString() }).where(eq(schema.care_gaps.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'dismissed', entityType: 'care_gap', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Guideline packs ───────────────────────────────────────────────────────────
app.get('/api/guideline-packs', async (c) => {
  try {
    return c.json(await db.select().from(schema.guideline_packs));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Exports ───────────────────────────────────────────────────────────────────
app.get('/api/export/visit-prep', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const [conditions, meds, allergyRows, labs, careGaps] = await Promise.all([
      db.select().from(schema.conditions)
        .where(and(eq(schema.conditions.patient_id, patient.id), eq(schema.conditions.status, 'active'), isNull(schema.conditions.deleted_at)))
        .orderBy(schema.conditions.name),
      db.select().from(schema.medications)
        .where(and(eq(schema.medications.patient_id, patient.id), eq(schema.medications.status, 'current'), isNull(schema.medications.deleted_at)))
        .orderBy(schema.medications.name),
      db.select().from(schema.allergies)
        .where(and(eq(schema.allergies.patient_id, patient.id), isNull(schema.allergies.deleted_at)))
        .orderBy(schema.allergies.allergen),
      db.select().from(schema.labs)
        .where(and(eq(schema.labs.patient_id, patient.id), isNull(schema.labs.deleted_at)))
        .orderBy(desc(schema.labs.collection_date))
        .limit(60),
      db.select().from(schema.care_gaps)
        .where(and(eq(schema.care_gaps.patient_id, patient.id), eq(schema.care_gaps.status, 'open'))),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const abnormal_labs = labs.filter(l =>
      l.interpretation && l.interpretation !== 'normal' &&
      new Date(l.collection_date) >= sixMonthsAgo
    );

    return c.json({ patient, conditions, medications: meds, allergies: allergyRows, abnormal_labs, care_gaps: careGaps });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/export/handoff', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const [conditions, meds, allergyRows, labs, vitalRows, vaccines, encounters, careGaps] = await Promise.all([
      db.select().from(schema.conditions)
        .where(and(eq(schema.conditions.patient_id, patient.id), isNull(schema.conditions.deleted_at)))
        .orderBy(schema.conditions.name),
      db.select().from(schema.medications)
        .where(and(eq(schema.medications.patient_id, patient.id), isNull(schema.medications.deleted_at)))
        .orderBy(schema.medications.name),
      db.select().from(schema.allergies)
        .where(and(eq(schema.allergies.patient_id, patient.id), isNull(schema.allergies.deleted_at)))
        .orderBy(schema.allergies.allergen),
      db.select().from(schema.labs)
        .where(and(eq(schema.labs.patient_id, patient.id), isNull(schema.labs.deleted_at)))
        .orderBy(desc(schema.labs.collection_date)),
      db.select().from(schema.vitals)
        .where(and(eq(schema.vitals.patient_id, patient.id), isNull(schema.vitals.deleted_at)))
        .orderBy(desc(schema.vitals.recorded_at))
        .limit(30),
      db.select().from(schema.vaccines)
        .where(and(eq(schema.vaccines.patient_id, patient.id), isNull(schema.vaccines.deleted_at)))
        .orderBy(desc(schema.vaccines.administered_date)),
      db.select().from(schema.encounters)
        .where(and(eq(schema.encounters.patient_id, patient.id), isNull(schema.encounters.deleted_at)))
        .orderBy(desc(schema.encounters.encounter_date))
        .limit(20),
      db.select().from(schema.care_gaps)
        .where(and(eq(schema.care_gaps.patient_id, patient.id), eq(schema.care_gaps.status, 'open'))),
    ]);

    const latestPerTest = new Map<string, typeof labs[0]>();
    for (const l of labs) {
      if (!latestPerTest.has(l.test_name)) latestPerTest.set(l.test_name, l);
    }

    return c.json({
      patient,
      conditions,
      medications: meds,
      allergies: allergyRows,
      labs_latest: Array.from(latestPerTest.values()),
      vitals: vitalRows,
      vaccines,
      encounters,
      care_gaps: careGaps,
      generated_at: new Date().toISOString(),
    });
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
    const config = await getAIConfig();
    if (!config.enabled) return c.json({ error: 'AI not enabled' }, 503);
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, chatRequestSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();

    const [conds, meds, labRows, allergyRows] = await Promise.all([
      db.select().from(schema.conditions).where(and(eq(schema.conditions.patient_id, patient.id), eq(schema.conditions.status, 'active'), isNull(schema.conditions.deleted_at))),
      db.select().from(schema.medications).where(and(eq(schema.medications.patient_id, patient.id), eq(schema.medications.status, 'current'), isNull(schema.medications.deleted_at))),
      db.select().from(schema.labs).where(and(eq(schema.labs.patient_id, patient.id), isNull(schema.labs.deleted_at))).orderBy(desc(schema.labs.collection_date)).limit(20),
      db.select().from(schema.allergies).where(and(eq(schema.allergies.patient_id, patient.id), isNull(schema.allergies.deleted_at))),
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
    const result = await chatWithRecord(body.message, history, context, config);

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

// ── Supplements ───────────────────────────────────────────────────────────────
app.get('/api/supplements', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.supplements).where(and(eq(schema.supplements.patient_id, patient.id), isNull(schema.supplements.deleted_at))).orderBy(desc(schema.supplements.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/supplements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.supplements).where(eq(schema.supplements.id, id)).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/supplements', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, supplementCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...body, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.supplements).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'supplement', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/supplements/:id', async (c) => {
  try {
    const parsed = await parseBody(c, supplementUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.supplements).where(eq(schema.supplements.id, id)).limit(1);
    await db.update(schema.supplements).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.supplements.id, id));
    const after = await db.select().from(schema.supplements).where(eq(schema.supplements.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'supplement', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/supplements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.supplements).where(eq(schema.supplements.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.supplements).set({ deleted_at: now, updated_at: now }).where(eq(schema.supplements.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'supplement', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Illness episodes ──────────────────────────────────────────────────────────
app.get('/api/illness-episodes', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.illness_episodes).where(and(eq(schema.illness_episodes.patient_id, patient.id), isNull(schema.illness_episodes.deleted_at))).orderBy(desc(schema.illness_episodes.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/illness-episodes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.illness_episodes).where(eq(schema.illness_episodes.id, id)).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/illness-episodes', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, illnessCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const symptoms_json = body.symptoms_json === undefined
      ? '[]'
      : typeof body.symptoms_json === 'string' ? body.symptoms_json : JSON.stringify(body.symptoms_json);
    const row = { id: uuid(), patient_id: patient.id, ...body, symptoms_json, user_confirmed: true, created_at: now, updated_at: now };
    await db.insert(schema.illness_episodes).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'illness_episode', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/illness-episodes/:id', async (c) => {
  try {
    const parsed = await parseBody(c, illnessUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.illness_episodes).where(eq(schema.illness_episodes.id, id)).limit(1);
    const data = { ...parsed.data } as Record<string, unknown>;
    if (data.symptoms_json !== undefined && typeof data.symptoms_json !== 'string') {
      data.symptoms_json = JSON.stringify(data.symptoms_json);
    }
    await db.update(schema.illness_episodes).set({ ...data, updated_at: new Date().toISOString() }).where(eq(schema.illness_episodes.id, id));
    const after = await db.select().from(schema.illness_episodes).where(eq(schema.illness_episodes.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'illness_episode', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/illness-episodes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.illness_episodes).where(eq(schema.illness_episodes.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.illness_episodes).set({ deleted_at: now, updated_at: now }).where(eq(schema.illness_episodes.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'illness_episode', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Medication administration log ─────────────────────────────────────────────
app.get('/api/med-admin-log', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.med_admin_log).where(and(eq(schema.med_admin_log.patient_id, patient.id), isNull(schema.med_admin_log.deleted_at))).orderBy(desc(schema.med_admin_log.administered_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/med-admin-log/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.med_admin_log).where(eq(schema.med_admin_log.id, id)).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/med-admin-log', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, medAdminCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.med_admin_log).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'med_admin', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/med-admin-log/:id', async (c) => {
  try {
    const parsed = await parseBody(c, medAdminUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.med_admin_log).where(eq(schema.med_admin_log.id, id)).limit(1);
    await db.update(schema.med_admin_log).set({ ...parsed.data }).where(eq(schema.med_admin_log.id, id));
    const after = await db.select().from(schema.med_admin_log).where(eq(schema.med_admin_log.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'med_admin', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/med-admin-log/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.med_admin_log).where(eq(schema.med_admin_log.id, id)).limit(1);
    await db.update(schema.med_admin_log).set({ deleted_at: new Date().toISOString() }).where(eq(schema.med_admin_log.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'med_admin', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Attachments ───────────────────────────────────────────────────────────────
const attachmentsDir = path.resolve(process.env.DATA_DIR ?? './data', 'attachments');
if (!existsSync(attachmentsDir)) mkdirSync(attachmentsDir, { recursive: true });

function extFromFilenameOrMime(filename: string, mime: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot > -1 && dot < filename.length - 1) {
    const ext = filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'application/pdf': 'pdf', 'text/plain': 'txt', 'application/json': 'json',
  };
  return map[mime] ?? 'bin';
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
// Only types that can't execute script on our origin are served inline;
// anything else (e.g. text/html, image/svg+xml) is forced to download.
const INLINE_SAFE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain',
]);

app.get('/api/attachments', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.attachments).where(and(eq(schema.attachments.patient_id, patient.id), isNull(schema.attachments.deleted_at))).orderBy(desc(schema.attachments.created_at)));
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/attachments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/attachments/:id/raw', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1);
    if (!rows.length || rows[0].deleted_at) return c.json({ error: 'not_found' }, 404);
    const att = rows[0];
    if (!existsSync(att.file_path)) return c.json({ error: 'file_missing' }, 404);
    const buf = readFileSync(att.file_path);
    const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const inlineSafe = INLINE_SAFE_MIMES.has(att.mime_type);
    const safeName = att.filename.replace(/[\r\n";\\]/g, '').slice(0, 200) || 'attachment';
    c.header('Content-Type', inlineSafe ? att.mime_type : 'application/octet-stream');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Content-Disposition', `${inlineSafe ? 'inline' : 'attachment'}; filename="${safeName}"`);
    return c.body(arr);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/attachments', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const form = await c.req.parseBody();
    const file = form['file'];
    if (!file || typeof file === 'string') return c.json({ error: 'file_required' }, 400);
    const f = file as File;
    if (f.size > MAX_ATTACHMENT_BYTES) return c.json({ error: 'file_too_large', max_bytes: MAX_ATTACHMENT_BYTES }, 413);
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = extFromFilenameOrMime(f.name, f.type || 'application/octet-stream');
    const id = uuid();
    const filePath = path.join(attachmentsDir, `${id}.${ext}`);
    writeFileSync(filePath, buf);

    const entity_type = typeof form['entity_type'] === 'string' ? form['entity_type'] as string : null;
    const entity_id = typeof form['entity_id'] === 'string' ? form['entity_id'] as string : null;
    const caption = typeof form['caption'] === 'string' ? form['caption'] as string : null;
    const taken_at = typeof form['taken_at'] === 'string' ? form['taken_at'] as string : null;

    const row = {
      id,
      patient_id: patient.id,
      entity_type,
      entity_id,
      mime_type: f.type || 'application/octet-stream',
      filename: f.name || `${id}.${ext}`,
      file_path: filePath,
      thumbnail_path: null,
      size_bytes: buf.length,
      width: null,
      height: null,
      taken_at,
      caption,
      created_at: new Date().toISOString(),
    };
    await db.insert(schema.attachments).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'attachment', entityId: row.id, diff: { after: { ...row, file_path: undefined } as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/attachments/:id', async (c) => {
  try {
    const parsed = await parseBody(c, attachmentUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1);
    await db.update(schema.attachments).set({ ...parsed.data }).where(eq(schema.attachments.id, id));
    const after = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'attachment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/attachments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).limit(1);
    await db.update(schema.attachments).set({ deleted_at: new Date().toISOString() }).where(eq(schema.attachments.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'attachment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Reminders ─────────────────────────────────────────────────────────────────
app.get('/api/reminders', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const rows = await db.select().from(schema.reminders)
      .where(eq(schema.reminders.patient_id, patient.id))
      .orderBy(desc(schema.reminders.due_at));
    return c.json(rows);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/reminders/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/reminders', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, reminderCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const now = new Date().toISOString();
    const payload_json = body.payload_json === undefined
      ? '{}'
      : typeof body.payload_json === 'string' ? body.payload_json : JSON.stringify(body.payload_json);
    const row = { id: uuid(), patient_id: patient.id, ...body, payload_json, created_at: now, updated_at: now };
    await db.insert(schema.reminders).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'reminder', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/reminders/:id', async (c) => {
  try {
    const parsed = await parseBody(c, reminderUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    const data = { ...parsed.data } as Record<string, unknown>;
    if (data.payload_json !== undefined && typeof data.payload_json !== 'string') {
      data.payload_json = JSON.stringify(data.payload_json);
    }
    await db.update(schema.reminders).set({ ...data, updated_at: new Date().toISOString() }).where(eq(schema.reminders.id, id));
    const after = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'reminder', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/reminders/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await db.delete(schema.reminders).where(eq(schema.reminders.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'reminder', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/reminders/:id/complete', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.reminders).set({ completed_at: now, updated_at: now }).where(eq(schema.reminders.id, id));
    const after = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'reminder', entityId: id, details: { lifecycle: 'completed' }, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/reminders/:id/dismiss', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.reminders).set({ dismissed_at: now, updated_at: now }).where(eq(schema.reminders.id, id));
    const after = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'dismissed', entityType: 'reminder', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/reminders/:id/snooze', async (c) => {
  try {
    const parsed = await parseBody(c, reminderSnoozeSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await db.update(schema.reminders).set({ snoozed_until: parsed.data.until, updated_at: new Date().toISOString() }).where(eq(schema.reminders.id, id));
    const after = await db.select().from(schema.reminders).where(eq(schema.reminders.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'reminder', entityId: id, details: { lifecycle: 'snoozed', until: parsed.data.until }, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── Workstream B Batch 2: body history & event tools ────────────────────────

function stringifyJsonField(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// Surgeries
app.get('/api/surgeries', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.surgeries).where(and(eq(schema.surgeries.patient_id, patient.id), isNull(schema.surgeries.deleted_at))).orderBy(desc(schema.surgeries.surgery_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/surgeries/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.surgeries).where(eq(schema.surgeries.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/surgeries', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, surgeryCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.surgeries).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'surgery', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/surgeries/:id', async (c) => {
  try {
    const parsed = await parseBody(c, surgeryUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.surgeries).where(eq(schema.surgeries.id, id)).limit(1);
    await db.update(schema.surgeries).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.surgeries.id, id));
    const after = await db.select().from(schema.surgeries).where(eq(schema.surgeries.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'surgery', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/surgeries/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.surgeries).where(eq(schema.surgeries.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.surgeries).set({ deleted_at: now, updated_at: now }).where(eq(schema.surgeries.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'surgery', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Implants
app.get('/api/implants', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.implants).where(and(eq(schema.implants.patient_id, patient.id), isNull(schema.implants.deleted_at))).orderBy(desc(schema.implants.placed_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/implants/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.implants).where(eq(schema.implants.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/implants', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, implantCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.implants).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'implant', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/implants/:id', async (c) => {
  try {
    const parsed = await parseBody(c, implantUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.implants).where(eq(schema.implants.id, id)).limit(1);
    await db.update(schema.implants).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.implants.id, id));
    const after = await db.select().from(schema.implants).where(eq(schema.implants.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'implant', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/implants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.implants).where(eq(schema.implants.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.implants).set({ deleted_at: now, updated_at: now }).where(eq(schema.implants.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'implant', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Equipment
app.get('/api/equipment', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.equipment).where(and(eq(schema.equipment.patient_id, patient.id), isNull(schema.equipment.deleted_at))).orderBy(desc(schema.equipment.acquired_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/equipment/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.equipment).where(eq(schema.equipment.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/equipment', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, equipmentCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.equipment).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'equipment', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/equipment/:id', async (c) => {
  try {
    const parsed = await parseBody(c, equipmentUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.equipment).where(eq(schema.equipment.id, id)).limit(1);
    await db.update(schema.equipment).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.equipment.id, id));
    const after = await db.select().from(schema.equipment).where(eq(schema.equipment.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'equipment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/equipment/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.equipment).where(eq(schema.equipment.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.equipment).set({ deleted_at: now, updated_at: now }).where(eq(schema.equipment.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'equipment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Sensitivities
app.get('/api/sensitivities', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.sensitivities).where(and(eq(schema.sensitivities.patient_id, patient.id), isNull(schema.sensitivities.deleted_at))).orderBy(desc(schema.sensitivities.created_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/sensitivities/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.sensitivities).where(eq(schema.sensitivities.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/sensitivities', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, sensitivityCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.sensitivities).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'sensitivity', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/sensitivities/:id', async (c) => {
  try {
    const parsed = await parseBody(c, sensitivityUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.sensitivities).where(eq(schema.sensitivities.id, id)).limit(1);
    await db.update(schema.sensitivities).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.sensitivities.id, id));
    const after = await db.select().from(schema.sensitivities).where(eq(schema.sensitivities.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'sensitivity', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/sensitivities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.sensitivities).where(eq(schema.sensitivities.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.sensitivities).set({ deleted_at: now, updated_at: now }).where(eq(schema.sensitivities.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'sensitivity', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Sex events
app.get('/api/sex-events', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.sex_events).where(and(eq(schema.sex_events.patient_id, patient.id), isNull(schema.sex_events.deleted_at))).orderBy(desc(schema.sex_events.occurred_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/sex-events', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, sexEventCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.sex_events).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'sex_event', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/sex-events/:id', async (c) => {
  try {
    const parsed = await parseBody(c, sexEventUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.sex_events).where(eq(schema.sex_events.id, id)).limit(1);
    await db.update(schema.sex_events).set({ ...parsed.data }).where(eq(schema.sex_events.id, id));
    const after = await db.select().from(schema.sex_events).where(eq(schema.sex_events.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'sex_event', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/sex-events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.sex_events).where(eq(schema.sex_events.id, id)).limit(1);
    await db.update(schema.sex_events).set({ deleted_at: new Date().toISOString() }).where(eq(schema.sex_events.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'sex_event', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Pregnancy outcomes
app.get('/api/pregnancy-outcomes', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.pregnancy_outcomes).where(and(eq(schema.pregnancy_outcomes.patient_id, patient.id), isNull(schema.pregnancy_outcomes.deleted_at))).orderBy(desc(schema.pregnancy_outcomes.outcome_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/pregnancy-outcomes', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, pregnancyOutcomeCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, hcg_followup_json: stringifyJsonField(parsed.data.hcg_followup_json) ?? '[]', created_at: now, updated_at: now };
    await db.insert(schema.pregnancy_outcomes).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'pregnancy_outcome', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/pregnancy-outcomes/:id', async (c) => {
  try {
    const parsed = await parseBody(c, pregnancyOutcomeUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.pregnancy_outcomes).where(eq(schema.pregnancy_outcomes.id, id)).limit(1);
    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.hcg_followup_json !== undefined) patch.hcg_followup_json = stringifyJsonField(parsed.data.hcg_followup_json);
    await db.update(schema.pregnancy_outcomes).set(patch).where(eq(schema.pregnancy_outcomes.id, id));
    const after = await db.select().from(schema.pregnancy_outcomes).where(eq(schema.pregnancy_outcomes.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'pregnancy_outcome', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/pregnancy-outcomes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.pregnancy_outcomes).where(eq(schema.pregnancy_outcomes.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.pregnancy_outcomes).set({ deleted_at: now, updated_at: now }).where(eq(schema.pregnancy_outcomes.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'pregnancy_outcome', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Ultrasounds
app.get('/api/ultrasounds', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.ultrasounds).where(and(eq(schema.ultrasounds.patient_id, patient.id), isNull(schema.ultrasounds.deleted_at))).orderBy(desc(schema.ultrasounds.performed_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/ultrasounds', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, ultrasoundCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, dimensions_json: stringifyJsonField(parsed.data.dimensions_json) ?? '{}', created_at: now, updated_at: now };
    await db.insert(schema.ultrasounds).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'ultrasound', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/ultrasounds/:id', async (c) => {
  try {
    const parsed = await parseBody(c, ultrasoundUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.ultrasounds).where(eq(schema.ultrasounds.id, id)).limit(1);
    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.dimensions_json !== undefined) patch.dimensions_json = stringifyJsonField(parsed.data.dimensions_json);
    await db.update(schema.ultrasounds).set(patch).where(eq(schema.ultrasounds.id, id));
    const after = await db.select().from(schema.ultrasounds).where(eq(schema.ultrasounds.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'ultrasound', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/ultrasounds/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.ultrasounds).where(eq(schema.ultrasounds.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.ultrasounds).set({ deleted_at: now, updated_at: now }).where(eq(schema.ultrasounds.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'ultrasound', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Micronutrients
app.get('/api/micronutrients', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const nutrient = c.req.query('nutrient');
    const conds: SQL[] = [eq(schema.micronutrients.patient_id, patient.id), isNull(schema.micronutrients.deleted_at)];
    if (nutrient) conds.push(eq(schema.micronutrients.nutrient, nutrient));
    return c.json(await db.select().from(schema.micronutrients).where(and(...conds)).orderBy(desc(schema.micronutrients.measured_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/micronutrients', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, micronutrientCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.micronutrients).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'micronutrient', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/micronutrients/:id', async (c) => {
  try {
    const parsed = await parseBody(c, micronutrientUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.micronutrients).where(eq(schema.micronutrients.id, id)).limit(1);
    await db.update(schema.micronutrients).set({ ...parsed.data }).where(eq(schema.micronutrients.id, id));
    const after = await db.select().from(schema.micronutrients).where(eq(schema.micronutrients.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'micronutrient', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/micronutrients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.micronutrients).where(eq(schema.micronutrients.id, id)).limit(1);
    await db.update(schema.micronutrients).set({ deleted_at: new Date().toISOString() }).where(eq(schema.micronutrients.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'micronutrient', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Access devices (lines, tubes, drains)
app.get('/api/access-devices', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.access_devices).where(and(eq(schema.access_devices.patient_id, patient.id), isNull(schema.access_devices.deleted_at))).orderBy(desc(schema.access_devices.placed_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/access-devices/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.access_devices).where(eq(schema.access_devices.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/access-devices', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, accessDeviceCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.access_devices).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'access_device', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/access-devices/:id', async (c) => {
  try {
    const parsed = await parseBody(c, accessDeviceUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.access_devices).where(eq(schema.access_devices.id, id)).limit(1);
    await db.update(schema.access_devices).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.access_devices.id, id));
    const after = await db.select().from(schema.access_devices).where(eq(schema.access_devices.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'access_device', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/access-devices/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.access_devices).where(eq(schema.access_devices.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.access_devices).set({ deleted_at: now, updated_at: now }).where(eq(schema.access_devices.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'access_device', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Workstream B Batch 3: pregnancy/reproductive tools ──────────────────────

// Kick sessions
app.get('/api/kick-sessions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.kick_sessions).where(and(eq(schema.kick_sessions.patient_id, patient.id), isNull(schema.kick_sessions.deleted_at))).orderBy(desc(schema.kick_sessions.started_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/kick-sessions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, kickSessionCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.kick_sessions).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'kick_session', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/kick-sessions/:id', async (c) => {
  try {
    const parsed = await parseBody(c, kickSessionUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.kick_sessions).where(eq(schema.kick_sessions.id, id)).limit(1);
    await db.update(schema.kick_sessions).set({ ...parsed.data }).where(eq(schema.kick_sessions.id, id));
    const after = await db.select().from(schema.kick_sessions).where(eq(schema.kick_sessions.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'kick_session', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/kick-sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.kick_sessions).where(eq(schema.kick_sessions.id, id)).limit(1);
    await db.update(schema.kick_sessions).set({ deleted_at: new Date().toISOString() }).where(eq(schema.kick_sessions.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'kick_session', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Contractions
app.get('/api/contractions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.contractions).where(and(eq(schema.contractions.patient_id, patient.id), isNull(schema.contractions.deleted_at))).orderBy(desc(schema.contractions.started_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/contractions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, contractionCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.contractions).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'contraction', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/contractions/:id', async (c) => {
  try {
    const parsed = await parseBody(c, contractionUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.contractions).where(eq(schema.contractions.id, id)).limit(1);
    await db.update(schema.contractions).set({ ...parsed.data }).where(eq(schema.contractions.id, id));
    const after = await db.select().from(schema.contractions).where(eq(schema.contractions.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'contraction', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/contractions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.contractions).where(eq(schema.contractions.id, id)).limit(1);
    await db.update(schema.contractions).set({ deleted_at: new Date().toISOString() }).where(eq(schema.contractions.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'contraction', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Pregnancies
app.get('/api/pregnancies', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.pregnancies).where(and(eq(schema.pregnancies.patient_id, patient.id), isNull(schema.pregnancies.deleted_at))).orderBy(desc(schema.pregnancies.lmp_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/pregnancies', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, pregnancyCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.pregnancies).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'pregnancy', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/pregnancies/:id', async (c) => {
  try {
    const parsed = await parseBody(c, pregnancyUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.pregnancies).where(eq(schema.pregnancies.id, id)).limit(1);
    await db.update(schema.pregnancies).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.pregnancies.id, id));
    const after = await db.select().from(schema.pregnancies).where(eq(schema.pregnancies.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'pregnancy', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/pregnancies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.pregnancies).where(eq(schema.pregnancies.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.pregnancies).set({ deleted_at: now, updated_at: now }).where(eq(schema.pregnancies.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'pregnancy', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Screening responses (EPDS, PHQ-9, GAD-7, etc.)
app.get('/api/screening-responses', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const instrument = c.req.query('instrument');
    const conds: SQL[] = [eq(schema.screening_responses.patient_id, patient.id), isNull(schema.screening_responses.deleted_at)];
    if (instrument) conds.push(eq(schema.screening_responses.instrument, instrument));
    return c.json(await db.select().from(schema.screening_responses).where(and(...conds)).orderBy(desc(schema.screening_responses.completed_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/screening-responses', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, screeningResponseCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, responses_json: stringifyJsonField(parsed.data.responses_json) ?? '[]', created_at: new Date().toISOString() };
    await db.insert(schema.screening_responses).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'screening_response', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/screening-responses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.screening_responses).where(eq(schema.screening_responses.id, id)).limit(1);
    await db.update(schema.screening_responses).set({ deleted_at: new Date().toISOString() }).where(eq(schema.screening_responses.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'screening_response', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Birth plans
app.get('/api/birth-plans', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.birth_plans).where(and(eq(schema.birth_plans.patient_id, patient.id), isNull(schema.birth_plans.deleted_at))).orderBy(desc(schema.birth_plans.created_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/birth-plans/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.birth_plans).where(eq(schema.birth_plans.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/birth-plans', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, birthPlanCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, plan_json: stringifyJsonField(parsed.data.plan_json) ?? '{}', created_at: now, updated_at: now };
    await db.insert(schema.birth_plans).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'birth_plan', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/birth-plans/:id', async (c) => {
  try {
    const parsed = await parseBody(c, birthPlanUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.birth_plans).where(eq(schema.birth_plans.id, id)).limit(1);
    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.plan_json !== undefined) patch.plan_json = stringifyJsonField(parsed.data.plan_json);
    await db.update(schema.birth_plans).set(patch).where(eq(schema.birth_plans.id, id));
    const after = await db.select().from(schema.birth_plans).where(eq(schema.birth_plans.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'birth_plan', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/birth-plans/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.birth_plans).where(eq(schema.birth_plans.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.birth_plans).set({ deleted_at: now, updated_at: now }).where(eq(schema.birth_plans.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'birth_plan', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Feeding events
app.get('/api/feeding-events', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.feeding_events).where(and(eq(schema.feeding_events.patient_id, patient.id), isNull(schema.feeding_events.deleted_at))).orderBy(desc(schema.feeding_events.started_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/feeding-events', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, feedingEventCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.feeding_events).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'feeding_event', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/feeding-events/:id', async (c) => {
  try {
    const parsed = await parseBody(c, feedingEventUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.feeding_events).where(eq(schema.feeding_events.id, id)).limit(1);
    await db.update(schema.feeding_events).set({ ...parsed.data }).where(eq(schema.feeding_events.id, id));
    const after = await db.select().from(schema.feeding_events).where(eq(schema.feeding_events.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'feeding_event', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/feeding-events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.feeding_events).where(eq(schema.feeding_events.id, id)).limit(1);
    await db.update(schema.feeding_events).set({ deleted_at: new Date().toISOString() }).where(eq(schema.feeding_events.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'feeding_event', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Jaundice observations
app.get('/api/jaundice-observations', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.jaundice_observations).where(and(eq(schema.jaundice_observations.patient_id, patient.id), isNull(schema.jaundice_observations.deleted_at))).orderBy(desc(schema.jaundice_observations.observed_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/jaundice-observations', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, jaundiceCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.jaundice_observations).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'jaundice_observation', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/jaundice-observations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.jaundice_observations).where(eq(schema.jaundice_observations.id, id)).limit(1);
    await db.update(schema.jaundice_observations).set({ deleted_at: new Date().toISOString() }).where(eq(schema.jaundice_observations.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'jaundice_observation', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Dialysis sessions
app.get('/api/dialysis-sessions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.dialysis_sessions).where(and(eq(schema.dialysis_sessions.patient_id, patient.id), isNull(schema.dialysis_sessions.deleted_at))).orderBy(desc(schema.dialysis_sessions.session_date)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/dialysis-sessions', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, dialysisCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.dialysis_sessions).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'dialysis_session', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/dialysis-sessions/:id', async (c) => {
  try {
    const parsed = await parseBody(c, dialysisUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.dialysis_sessions).where(eq(schema.dialysis_sessions.id, id)).limit(1);
    await db.update(schema.dialysis_sessions).set({ ...parsed.data }).where(eq(schema.dialysis_sessions.id, id));
    const after = await db.select().from(schema.dialysis_sessions).where(eq(schema.dialysis_sessions.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'dialysis_session', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/dialysis-sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.dialysis_sessions).where(eq(schema.dialysis_sessions.id, id)).limit(1);
    await db.update(schema.dialysis_sessions).set({ deleted_at: new Date().toISOString() }).where(eq(schema.dialysis_sessions.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'dialysis_session', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Cycles + cycle days
app.get('/api/cycles', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.cycles).where(and(eq(schema.cycles.patient_id, patient.id), isNull(schema.cycles.deleted_at))).orderBy(desc(schema.cycles.started_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/cycles', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, cycleCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.cycles).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'cycle', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/cycles/:id', async (c) => {
  try {
    const parsed = await parseBody(c, cycleUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.cycles).where(eq(schema.cycles.id, id)).limit(1);
    await db.update(schema.cycles).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.cycles.id, id));
    const after = await db.select().from(schema.cycles).where(eq(schema.cycles.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'cycle', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/cycles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.cycles).where(eq(schema.cycles.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.cycles).set({ deleted_at: now, updated_at: now }).where(eq(schema.cycles.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'cycle', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

app.get('/api/cycles/:cycleId/days', async (c) => {
  try {
    const cycleId = c.req.param('cycleId');
    return c.json(await db.select().from(schema.cycle_days).where(eq(schema.cycle_days.cycle_id, cycleId)).orderBy(schema.cycle_days.day_of_cycle));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/cycle-days', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, cycleDayCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: now, updated_at: now };
    await db.insert(schema.cycle_days).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'cycle_day', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/cycle-days/:id', async (c) => {
  try {
    const parsed = await parseBody(c, cycleDayUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.cycle_days).where(eq(schema.cycle_days.id, id)).limit(1);
    await db.update(schema.cycle_days).set({ ...parsed.data, updated_at: new Date().toISOString() }).where(eq(schema.cycle_days.id, id));
    const after = await db.select().from(schema.cycle_days).where(eq(schema.cycle_days.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'cycle_day', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// LH tests
app.get('/api/lh-tests', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.lh_tests).where(and(eq(schema.lh_tests.patient_id, patient.id), isNull(schema.lh_tests.deleted_at))).orderBy(desc(schema.lh_tests.taken_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/lh-tests', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, lhTestCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.lh_tests).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'lh_test', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/lh-tests/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.lh_tests).where(eq(schema.lh_tests.id, id)).limit(1);
    await db.update(schema.lh_tests).set({ deleted_at: new Date().toISOString() }).where(eq(schema.lh_tests.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'lh_test', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Pregnancy tests
app.get('/api/pregnancy-tests', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.pregnancy_tests).where(and(eq(schema.pregnancy_tests.patient_id, patient.id), isNull(schema.pregnancy_tests.deleted_at))).orderBy(desc(schema.pregnancy_tests.taken_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/pregnancy-tests', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, pregnancyTestCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, created_at: new Date().toISOString() };
    await db.insert(schema.pregnancy_tests).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'pregnancy_test', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/pregnancy-tests/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.pregnancy_tests).where(eq(schema.pregnancy_tests.id, id)).limit(1);
    await db.update(schema.pregnancy_tests).set({ deleted_at: new Date().toISOString() }).where(eq(schema.pregnancy_tests.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'pregnancy_test', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Workstream B Batch 4: mind/experiential tools ───────────────────────────

// Mood entries
app.get('/api/mood-entries', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.mood_entries).where(and(eq(schema.mood_entries.patient_id, patient.id), isNull(schema.mood_entries.deleted_at))).orderBy(desc(schema.mood_entries.logged_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/mood-entries', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, moodEntryCreateSchema);
    if (!parsed.ok) return parsed.response;
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, tags_json: stringifyJsonField(parsed.data.tags_json) ?? '[]', created_at: new Date().toISOString() };
    await db.insert(schema.mood_entries).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'mood_entry', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/mood-entries/:id', async (c) => {
  try {
    const parsed = await parseBody(c, moodEntryUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.mood_entries).where(eq(schema.mood_entries.id, id)).limit(1);
    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.tags_json !== undefined) patch.tags_json = stringifyJsonField(parsed.data.tags_json);
    await db.update(schema.mood_entries).set(patch).where(eq(schema.mood_entries.id, id));
    const after = await db.select().from(schema.mood_entries).where(eq(schema.mood_entries.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'mood_entry', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/mood-entries/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.mood_entries).where(eq(schema.mood_entries.id, id)).limit(1);
    await db.update(schema.mood_entries).set({ deleted_at: new Date().toISOString() }).where(eq(schema.mood_entries.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'mood_entry', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// Experiments
app.get('/api/experiments', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    return c.json(await db.select().from(schema.experiments).where(and(eq(schema.experiments.patient_id, patient.id), isNull(schema.experiments.deleted_at))).orderBy(desc(schema.experiments.created_at)));
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.get('/api/experiments/:id', async (c) => {
  try {
    const rows = await db.select().from(schema.experiments).where(eq(schema.experiments.id, c.req.param('id'))).limit(1);
    if (!rows.length) return c.json({ error: 'not_found' }, 404);
    return c.json(rows[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.post('/api/experiments', async (c) => {
  try {
    const patient = await getOrCreatePatient();
    const parsed = await parseBody(c, experimentCreateSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date().toISOString();
    const row = { id: uuid(), patient_id: patient.id, ...parsed.data, target_metrics_json: stringifyJsonField(parsed.data.target_metrics_json) ?? '[]', created_at: now, updated_at: now };
    await db.insert(schema.experiments).values(row);
    await audit({ patientId: patient.id, action: 'created', entityType: 'experiment', entityId: row.id, diff: { after: row as Record<string, unknown> } });
    return c.json(row, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.patch('/api/experiments/:id', async (c) => {
  try {
    const parsed = await parseBody(c, experimentUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const id = c.req.param('id');
    const before = await db.select().from(schema.experiments).where(eq(schema.experiments.id, id)).limit(1);
    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
    if (parsed.data.target_metrics_json !== undefined) patch.target_metrics_json = stringifyJsonField(parsed.data.target_metrics_json);
    await db.update(schema.experiments).set(patch).where(eq(schema.experiments.id, id));
    const after = await db.select().from(schema.experiments).where(eq(schema.experiments.id, id)).limit(1);
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'updated', entityType: 'experiment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown>, after: after[0] as unknown as Record<string, unknown> } });
    return c.json(after[0]);
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});
app.delete('/api/experiments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const before = await db.select().from(schema.experiments).where(eq(schema.experiments.id, id)).limit(1);
    const now = new Date().toISOString();
    await db.update(schema.experiments).set({ deleted_at: now, updated_at: now }).where(eq(schema.experiments.id, id));
    await audit({ patientId: before[0]?.patient_id ?? null, action: 'deleted', entityType: 'experiment', entityId: id, diff: { before: before[0] as unknown as Record<string, unknown> } });
    return c.json({ ok: true });
  } catch (e) { console.error(e); return c.json({ error: 'Internal server error' }, 500); }
});

// ── Static (production) ───────────────────────────────────────────────────────
const staticDir = process.env.STATIC_DIR ?? path.resolve(__dirname, '../../web/dist');
if (existsSync(staticDir)) {
  app.use('/*', serveStatic({ root: staticDir }));
  // SPA fallback: client-side routes like /reminders must serve index.html on refresh
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404);
    return c.html(readFileSync(path.join(staticDir, 'index.html'), 'utf-8'));
  });
}

const port = parseInt(process.env.PORT ?? '3104');
const hostname = process.env.HOST ?? '127.0.0.1';

async function startup() {
  initDb();
  await seedGuidelines();
  const patient = await getOrCreatePatient();
  await detectCareGaps(patient.id);
  console.log(`HealthBinder server starting on ${hostname}:${port}`);
  const aiConfig = await getAIConfig();
  console.log(`AI enabled: ${aiConfig.enabled}`);
  serve({ fetch: app.fetch, port, hostname });
}

startup().catch(console.error);
