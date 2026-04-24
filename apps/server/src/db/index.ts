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
  `);
}
