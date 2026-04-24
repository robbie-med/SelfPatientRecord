import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COUNTRY_PACKS_DIR = path.resolve(__dirname, '../../../packages/country-packs');

interface OrgEntry {
  id: string;
  name: string;
  abbreviation?: string;
  country: string;
  website?: string;
  type?: string;
}

interface RecEntry {
  id: string;
  organization_id: string;
  country: string;
  topic: string;
  subtopic?: string;
  module_tags?: string[];
  title: string;
  recommendation_text: string;
  patient_facing_summary: string;
  evidence_grade?: string;
  age_min?: number;
  age_max?: number;
  sex_relevance?: string[];
  pregnancy_relevance?: string;
  risk_factors?: Record<string, unknown>;
  interval_months?: number;
  source_url?: string;
  version_date?: string;
}

interface CountryPack {
  organizations: OrgEntry[];
  recommendations: RecEntry[];
}

export async function seedGuidelines(): Promise<void> {
  if (!existsSync(COUNTRY_PACKS_DIR)) {
    console.log('[seed-guidelines] Country packs directory not found, skipping.');
    return;
  }

  const countries = readdirSync(COUNTRY_PACKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let orgCount = 0;
  let recCount = 0;

  for (const country of countries) {
    const packFile = path.join(COUNTRY_PACKS_DIR, country, 'preventive-care.json');
    if (!existsSync(packFile)) continue;

    let pack: CountryPack;
    try {
      pack = JSON.parse(readFileSync(packFile, 'utf-8'));
    } catch (e) {
      console.error(`[seed-guidelines] Failed to parse ${packFile}:`, e);
      continue;
    }

    for (const org of pack.organizations ?? []) {
      const existing = await db.select({ id: schema.guideline_organizations.id })
        .from(schema.guideline_organizations)
        .where(eq(schema.guideline_organizations.id, org.id))
        .limit(1);
      if (!existing.length) {
        await db.insert(schema.guideline_organizations).values({
          id: org.id,
          name: org.name,
          abbreviation: org.abbreviation ?? null,
          country: org.country,
          website: org.website ?? null,
          type: org.type ?? null,
        });
        orgCount++;
      }
    }

    for (const rec of pack.recommendations ?? []) {
      const existing = await db.select({ id: schema.guideline_recommendations.id })
        .from(schema.guideline_recommendations)
        .where(eq(schema.guideline_recommendations.id, rec.id))
        .limit(1);
      if (!existing.length) {
        await db.insert(schema.guideline_recommendations).values({
          id: rec.id,
          organization_id: rec.organization_id,
          country: rec.country,
          topic: rec.topic,
          subtopic: rec.subtopic ?? null,
          module_tags: JSON.stringify(rec.module_tags ?? []),
          title: rec.title,
          recommendation_text: rec.recommendation_text,
          patient_facing_summary: rec.patient_facing_summary,
          evidence_grade: rec.evidence_grade ?? null,
          age_min: rec.age_min ?? null,
          age_max: rec.age_max ?? null,
          sex_relevance: JSON.stringify(rec.sex_relevance ?? ['male', 'female']),
          pregnancy_relevance: rec.pregnancy_relevance ?? 'any',
          risk_factors: JSON.stringify(rec.risk_factors ?? {}),
          interval_months: rec.interval_months ?? null,
          source_url: rec.source_url ?? null,
          version_date: rec.version_date ?? null,
          is_active: true,
          created_at: new Date().toISOString(),
        });
        recCount++;
      }
    }
  }

  if (orgCount || recCount) {
    console.log(`[seed-guidelines] Inserted ${orgCount} organizations, ${recCount} recommendations.`);
  }
}
