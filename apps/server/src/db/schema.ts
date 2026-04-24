import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

const now = () => new Date().toISOString();

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  legal_name: text('legal_name').notNull(),
  preferred_name: text('preferred_name'),
  date_of_birth: text('date_of_birth'),
  sex_at_birth: text('sex_at_birth').default('unknown'),
  gender_identity: text('gender_identity'),
  pregnancy_capable: integer('pregnancy_capable', { mode: 'boolean' }).default(false),
  pregnancy_status: text('pregnancy_status'),
  country_of_birth: text('country_of_birth').default('US'),
  current_country: text('current_country').default('US'),
  preferred_language: text('preferred_language').default('en'),
  secondary_languages: text('secondary_languages').default('[]'),
  preferred_guideline_country: text('preferred_guideline_country').default('US'),
  preferred_units: text('preferred_units').default('metric'),
  preferred_date_format: text('preferred_date_format').default('YYYY-MM-DD'),
  guideline_lens: text('guideline_lens').default('{}'),
  created_at: text('created_at').notNull().$defaultFn(now),
  updated_at: text('updated_at').notNull().$defaultFn(now),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  title: text('title').notNull(),
  source_type: text('source_type').default('paste'),
  raw_text: text('raw_text'),
  document_type: text('document_type').default('other'),
  encounter_date: text('encounter_date'),
  facility: text('facility'),
  provider: text('provider'),
  extraction_status: text('extraction_status').default('pending'),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const extracted_facts = sqliteTable('extracted_facts', {
  id: text('id').primaryKey(),
  document_id: text('document_id').notNull().references(() => documents.id),
  fact_type: text('fact_type').notNull(),
  raw_data: text('raw_data').notNull(),
  source_quote: text('source_quote'),
  confidence: real('confidence'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(false),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const conditions = sqliteTable('conditions', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  name: text('name').notNull(),
  status: text('status').default('active'),
  onset_date: text('onset_date'),
  resolved_date: text('resolved_date'),
  source_document_id: text('source_document_id'),
  source_quote: text('source_quote'),
  notes: text('notes'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
  updated_at: text('updated_at').notNull().$defaultFn(now),
});

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  name: text('name').notNull(),
  generic_name: text('generic_name'),
  dose: text('dose'),
  route: text('route'),
  frequency: text('frequency'),
  indication: text('indication'),
  status: text('status').default('current'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  prescriber: text('prescriber'),
  pharmacy: text('pharmacy'),
  notes: text('notes'),
  source_document_id: text('source_document_id'),
  source_quote: text('source_quote'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
  updated_at: text('updated_at').notNull().$defaultFn(now),
});

export const labs = sqliteTable('labs', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  test_name: text('test_name').notNull(),
  value: text('value').notNull(),
  numeric_value: real('numeric_value'),
  unit: text('unit'),
  reference_range_low: real('reference_range_low'),
  reference_range_high: real('reference_range_high'),
  interpretation: text('interpretation'),
  collection_date: text('collection_date').notNull(),
  ordering_provider: text('ordering_provider'),
  panel: text('panel'),
  source_document_id: text('source_document_id'),
  source_quote: text('source_quote'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const vitals = sqliteTable('vitals', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  vital_type: text('vital_type').notNull(),
  value: text('value').notNull(),
  unit: text('unit'),
  recorded_at: text('recorded_at').notNull(),
  context: text('context'),
  source_document_id: text('source_document_id'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const allergies = sqliteTable('allergies', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  allergen: text('allergen').notNull(),
  allergen_type: text('allergen_type').default('other'),
  reaction: text('reaction'),
  severity: text('severity'),
  onset_date: text('onset_date'),
  status: text('status').default('active'),
  source_document_id: text('source_document_id'),
  source_quote: text('source_quote'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const vaccines = sqliteTable('vaccines', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  vaccine_name: text('vaccine_name').notNull(),
  dose_number: integer('dose_number'),
  administered_date: text('administered_date').notNull(),
  lot_number: text('lot_number'),
  site: text('site'),
  administered_by: text('administered_by'),
  facility: text('facility'),
  source_document_id: text('source_document_id'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const encounters = sqliteTable('encounters', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  encounter_type: text('encounter_type').default('office_visit'),
  facility: text('facility'),
  provider: text('provider'),
  encounter_date: text('encounter_date').notNull(),
  discharge_date: text('discharge_date'),
  chief_complaint: text('chief_complaint'),
  assessment: text('assessment'),
  diagnoses: text('diagnoses').default('[]'),
  source_document_id: text('source_document_id'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const imaging_reports = sqliteTable('imaging_reports', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  study_type: text('study_type').notNull(),
  body_part: text('body_part'),
  indication: text('indication'),
  findings: text('findings'),
  impression: text('impression'),
  radiologist: text('radiologist'),
  study_date: text('study_date'),
  follow_up_recommended: integer('follow_up_recommended', { mode: 'boolean' }).default(false),
  follow_up_notes: text('follow_up_notes'),
  source_document_id: text('source_document_id'),
  source_quote: text('source_quote'),
  user_confirmed: integer('user_confirmed', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const module_status = sqliteTable('module_status', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  module_id: text('module_id').notNull(),
  status: text('status').default('off'),
  activated_at: text('activated_at'),
  trigger_reason: text('trigger_reason'),
  created_at: text('created_at').notNull().$defaultFn(now),
  updated_at: text('updated_at').notNull().$defaultFn(now),
});

export const guideline_organizations = sqliteTable('guideline_organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation'),
  country: text('country').notNull(),
  website: text('website'),
  type: text('type'),
});

export const guideline_recommendations = sqliteTable('guideline_recommendations', {
  id: text('id').primaryKey(),
  organization_id: text('organization_id').references(() => guideline_organizations.id),
  country: text('country').notNull(),
  topic: text('topic').notNull(),
  subtopic: text('subtopic'),
  module_tags: text('module_tags').default('[]'),
  title: text('title').notNull(),
  recommendation_text: text('recommendation_text').notNull(),
  patient_facing_summary: text('patient_facing_summary').notNull(),
  evidence_grade: text('evidence_grade'),
  age_min: integer('age_min'),
  age_max: integer('age_max'),
  sex_relevance: text('sex_relevance').default('["male","female"]'),
  pregnancy_relevance: text('pregnancy_relevance').default('any'),
  risk_factors: text('risk_factors').default('{}'),
  interval_months: integer('interval_months'),
  source_url: text('source_url'),
  version_date: text('version_date'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const care_gaps = sqliteTable('care_gaps', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  gap_type: text('gap_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  urgency: text('urgency').default('routine'),
  recommendation_id: text('recommendation_id'),
  status: text('status').default('open'),
  detected_at: text('detected_at').notNull().$defaultFn(now),
  resolved_at: text('resolved_at'),
});

export const chat_messages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id').notNull().references(() => patients.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  citations: text('citations').default('[]'),
  created_at: text('created_at').notNull().$defaultFn(now),
});

export const audit_log = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  patient_id: text('patient_id'),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id'),
  details: text('details'),
  ai_involved: integer('ai_involved', { mode: 'boolean' }).default(false),
  created_at: text('created_at').notNull().$defaultFn(now),
});
