import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR ?? './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, 'healthbinder.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      legal_name TEXT NOT NULL,
      preferred_name TEXT,
      date_of_birth TEXT,
      sex_at_birth TEXT DEFAULT 'unknown',
      gender_identity TEXT,
      pregnancy_capable INTEGER DEFAULT 0,
      pregnancy_status TEXT,
      country_of_birth TEXT DEFAULT 'US',
      current_country TEXT DEFAULT 'US',
      preferred_language TEXT DEFAULT 'en',
      secondary_languages TEXT DEFAULT '[]',
      preferred_guideline_country TEXT DEFAULT 'US',
      preferred_units TEXT DEFAULT 'metric',
      preferred_date_format TEXT DEFAULT 'YYYY-MM-DD',
      guideline_lens TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      title TEXT NOT NULL,
      source_type TEXT DEFAULT 'paste',
      raw_text TEXT,
      document_type TEXT DEFAULT 'other',
      encounter_date TEXT,
      facility TEXT,
      provider TEXT,
      extraction_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS extracted_facts (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      fact_type TEXT NOT NULL,
      raw_data TEXT NOT NULL,
      source_quote TEXT,
      confidence REAL,
      user_confirmed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conditions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      onset_date TEXT,
      resolved_date TEXT,
      source_document_id TEXT,
      source_quote TEXT,
      notes TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      name TEXT NOT NULL,
      generic_name TEXT,
      dose TEXT,
      route TEXT,
      frequency TEXT,
      indication TEXT,
      status TEXT DEFAULT 'current',
      start_date TEXT,
      end_date TEXT,
      prescriber TEXT,
      pharmacy TEXT,
      notes TEXT,
      source_document_id TEXT,
      source_quote TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS labs (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      test_name TEXT NOT NULL,
      value TEXT NOT NULL,
      numeric_value REAL,
      unit TEXT,
      reference_range_low REAL,
      reference_range_high REAL,
      interpretation TEXT,
      collection_date TEXT NOT NULL,
      ordering_provider TEXT,
      panel TEXT,
      source_document_id TEXT,
      source_quote TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      vital_type TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT,
      recorded_at TEXT NOT NULL,
      context TEXT,
      source_document_id TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS allergies (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      allergen TEXT NOT NULL,
      allergen_type TEXT DEFAULT 'other',
      reaction TEXT,
      severity TEXT,
      onset_date TEXT,
      status TEXT DEFAULT 'active',
      source_document_id TEXT,
      source_quote TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vaccines (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      vaccine_name TEXT NOT NULL,
      dose_number INTEGER,
      administered_date TEXT NOT NULL,
      lot_number TEXT,
      site TEXT,
      administered_by TEXT,
      facility TEXT,
      source_document_id TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      encounter_type TEXT DEFAULT 'office_visit',
      facility TEXT,
      provider TEXT,
      encounter_date TEXT NOT NULL,
      discharge_date TEXT,
      chief_complaint TEXT,
      assessment TEXT,
      diagnoses TEXT DEFAULT '[]',
      source_document_id TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS imaging_reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      study_type TEXT NOT NULL,
      body_part TEXT,
      indication TEXT,
      findings TEXT,
      impression TEXT,
      radiologist TEXT,
      study_date TEXT,
      follow_up_recommended INTEGER DEFAULT 0,
      follow_up_notes TEXT,
      source_document_id TEXT,
      source_quote TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS module_status (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      module_id TEXT NOT NULL,
      status TEXT DEFAULT 'off',
      activated_at TEXT,
      trigger_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guideline_organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT,
      country TEXT NOT NULL,
      website TEXT,
      type TEXT
    );
    CREATE TABLE IF NOT EXISTS guideline_recommendations (
      id TEXT PRIMARY KEY,
      organization_id TEXT REFERENCES guideline_organizations(id),
      country TEXT NOT NULL,
      topic TEXT NOT NULL,
      subtopic TEXT,
      module_tags TEXT DEFAULT '[]',
      title TEXT NOT NULL,
      recommendation_text TEXT NOT NULL,
      patient_facing_summary TEXT NOT NULL,
      evidence_grade TEXT,
      age_min INTEGER,
      age_max INTEGER,
      sex_relevance TEXT DEFAULT '["male","female"]',
      pregnancy_relevance TEXT DEFAULT 'any',
      risk_factors TEXT DEFAULT '{}',
      interval_months INTEGER,
      source_url TEXT,
      version_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS care_gaps (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      gap_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT DEFAULT 'routine',
      recommendation_id TEXT,
      status TEXT DEFAULT 'open',
      detected_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      provider TEXT DEFAULT 'ppq',
      base_url TEXT DEFAULT 'https://api.ppq.ai/v1',
      api_key TEXT,
      extraction_model TEXT DEFAULT 'anthropic/claude-3.5-haiku',
      chat_model TEXT DEFAULT 'anthropic/claude-3.5-haiku',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guideline_packs (
      country TEXT PRIMARY KEY,
      last_reviewed TEXT NOT NULL,
      seeded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ai_involved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      target_entity_type TEXT,
      target_entity_id TEXT,
      prevention_category TEXT,
      due_at TEXT,
      snoozed_until TEXT,
      dismissed_at TEXT,
      completed_at TEXT,
      payload_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supplements (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      name TEXT NOT NULL,
      dose TEXT, unit TEXT, frequency TEXT, brand TEXT, reason TEXT,
      start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'current',
      notes TEXT,
      source_document_id TEXT, source_quote TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS illness_episodes (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      title TEXT NOT NULL,
      symptoms_json TEXT DEFAULT '[]',
      onset_date TEXT, end_date TEXT,
      severity TEXT, treatments TEXT, outcome TEXT, notes TEXT,
      source_document_id TEXT,
      user_confirmed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS med_admin_log (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      medication_id TEXT REFERENCES medications(id),
      medication_name TEXT NOT NULL,
      administered_at TEXT NOT NULL,
      dose_given TEXT, route TEXT, note TEXT,
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      entity_type TEXT, entity_id TEXT,
      mime_type TEXT NOT NULL, filename TEXT NOT NULL, file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      size_bytes INTEGER, width INTEGER, height INTEGER,
      taken_at TEXT, caption TEXT,
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS kick_sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      started_at TEXT NOT NULL, ended_at TEXT,
      count INTEGER DEFAULT 0, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS contractions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      started_at TEXT NOT NULL, ended_at TEXT,
      intensity TEXT, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pregnancies (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      lmp_date TEXT, edd TEXT, conception_method TEXT,
      status TEXT DEFAULT 'active',
      outcome TEXT, outcome_date TEXT, notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS screening_responses (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      instrument TEXT NOT NULL,
      responses_json TEXT DEFAULT '[]',
      total_score REAL, interpretation TEXT,
      completed_at TEXT NOT NULL, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS birth_plans (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      title TEXT DEFAULT 'Birth Plan',
      plan_json TEXT NOT NULL DEFAULT '{}',
      finalized_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS feeding_events (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      started_at TEXT NOT NULL, ended_at TEXT,
      side TEXT, volume_ml REAL,
      kind TEXT DEFAULT 'breast', notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS jaundice_observations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      infant_dob TEXT NOT NULL, observed_at TEXT NOT NULL,
      day_of_life INTEGER, area_affected TEXT, notes TEXT,
      photo_attachment_id TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS dialysis_sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      session_date TEXT NOT NULL,
      duration_min INTEGER, access_site TEXT,
      pre_weight REAL, post_weight REAL, uf_goal REAL, uf_achieved REAL,
      complications_text TEXT, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS surgeries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      name TEXT NOT NULL, surgery_date TEXT,
      surgeon TEXT, facility TEXT, indication TEXT, approach TEXT,
      complications_text TEXT, recovery_notes TEXT,
      related_condition_id TEXT, source_document_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS implants (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      kind TEXT NOT NULL, name TEXT NOT NULL,
      body_site TEXT, laterality TEXT,
      manufacturer TEXT, model TEXT, serial TEXT, lot TEXT,
      placed_date TEXT, removed_date TEXT, removal_reason TEXT,
      mri_safety TEXT, photo_attachment_id TEXT, notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      kind TEXT NOT NULL,
      brand TEXT, model TEXT, serial TEXT,
      acquired_date TEXT, retired_date TEXT, last_serviced_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sensitivities (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      substance TEXT NOT NULL,
      kind TEXT DEFAULT 'food',
      reaction TEXT, severity TEXT, onset_date TEXT,
      confirmed_by TEXT, notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sex_events (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      occurred_at TEXT NOT NULL,
      kind TEXT, partner_type TEXT, protection TEXT,
      pregnancy_risk TEXT, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pregnancy_outcomes (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      pregnancy_id TEXT,
      conception_date_est TEXT,
      outcome TEXT NOT NULL, outcome_date TEXT NOT NULL,
      gestational_age_at_outcome TEXT,
      treatment TEXT,
      hcg_followup_json TEXT DEFAULT '[]',
      emotional_notes TEXT, future_planning_notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ultrasounds (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      performed_at TEXT NOT NULL,
      organ_or_site TEXT NOT NULL,
      indication TEXT, findings TEXT,
      dimensions_json TEXT DEFAULT '{}',
      sonographer TEXT, facility TEXT,
      related_imaging_report_id TEXT, photo_attachment_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS micronutrients (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      nutrient TEXT NOT NULL,
      value REAL NOT NULL, unit TEXT,
      measured_at TEXT NOT NULL,
      lab_source TEXT,
      ref_low REAL, ref_high REAL, optimal_low REAL, optimal_high REAL,
      supplementation_active INTEGER DEFAULT 0,
      source_lab_id TEXT, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS access_devices (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      kind TEXT NOT NULL,
      subtype TEXT, anatomical_site TEXT, laterality TEXT,
      placed_at TEXT, placed_by TEXT, placed_facility TEXT,
      indication TEXT, gauge_or_size TEXT, lumens INTEGER,
      removed_at TEXT, removal_reason TEXT, complications_text TEXT,
      dressing_change_interval_days INTEGER,
      last_dressing_change_at TEXT, line_care_notes_markdown TEXT,
      photo_attachment_id TEXT, related_condition_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      started_at TEXT NOT NULL, ended_at TEXT, notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS cycle_days (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL REFERENCES cycles(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      day_of_cycle INTEGER NOT NULL, date TEXT NOT NULL,
      bbt REAL,
      cervical_mucus_kind TEXT, cervical_position TEXT,
      bleeding_kind TEXT, bleeding_amount TEXT,
      ovulation_pain INTEGER DEFAULT 0,
      intercourse INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lh_tests (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      cycle_id TEXT,
      taken_at TEXT NOT NULL,
      result TEXT, intensity INTEGER, brand TEXT,
      photo_attachment_id TEXT, notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pregnancy_tests (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      taken_at TEXT NOT NULL,
      result TEXT, kind TEXT,
      photo_attachment_id TEXT,
      follow_up_hcg_quantitative REAL,
      notes TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      logged_at TEXT NOT NULL,
      mood_score INTEGER, energy_score INTEGER,
      anxiety_score INTEGER, irritability_score INTEGER,
      tags_json TEXT DEFAULT '[]',
      notes_markdown TEXT,
      created_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      hypothesis TEXT NOT NULL,
      started_at TEXT, ended_at TEXT,
      baseline_period_days INTEGER, intervention_period_days INTEGER,
      intervention_description TEXT,
      target_metrics_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'planned',
      conclusion_markdown TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
  `);

  const addColumn = (table: string, column: string, type: string) => {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (!/duplicate column name/i.test(msg)) throw e;
    }
  };

  addColumn('guideline_recommendations', 'title_native', 'TEXT');
  addColumn('guideline_recommendations', 'recommendation_text_native', 'TEXT');
  addColumn('guideline_recommendations', 'patient_facing_summary_native', 'TEXT');
  addColumn('guideline_recommendations', 'native_language', 'TEXT');
  addColumn('guideline_recommendations', 'prevention_category', 'TEXT');
  addColumn('guideline_recommendations', 'recommendation_polarity', "TEXT DEFAULT 'for'");
  addColumn('guideline_recommendations', 'source_file', 'TEXT');
  addColumn('care_gaps', 'prevention_category', 'TEXT');
  addColumn('audit_log', 'diff_json', 'TEXT');

  // Soft-delete column on every canonical entity
  for (const t of [
    'documents', 'conditions', 'medications', 'labs', 'vitals',
    'allergies', 'vaccines', 'encounters', 'imaging_reports',
  ]) {
    addColumn(t, 'deleted_at', 'TEXT');
  }
}
