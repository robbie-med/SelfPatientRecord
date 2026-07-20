import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COUNTRY_PACKS_DIR = process.env.COUNTRY_PACKS_DIR
  ?? path.resolve(__dirname, '../../../../packages/country-packs');

const PREVENTION_CATEGORIES = [
  'primary_prevention',
  'secondary_prevention',
  'tertiary_prevention',
  'vaccination',
  'chemoprevention',
  'augmentation',
  'supplementation',
] as const;

// Files with their own schema, seeded elsewhere (lab-access.json → Workstream K)
const NON_GUIDELINE_FILES = new Set(['lab-access.json']);

type LocalizedText = string | { en?: string } & Record<string, string | undefined>;

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
  title: LocalizedText;
  recommendation_text: LocalizedText;
  patient_facing_summary: LocalizedText;
  evidence_grade?: string;
  age_min?: number;
  age_max?: number;
  sex_relevance?: string[];
  pregnancy_relevance?: string;
  risk_factors?: Record<string, unknown>;
  interval_months?: number;
  source_url?: string;
  version_date?: string;
  prevention_category?: string;
  recommendation_polarity?: string;
}

interface PackFile {
  country?: string;
  language?: string;
  last_reviewed?: string;
  prevention_category?: string;
  organizations?: OrgEntry[];
  recommendations?: RecEntry[];
}

function resolveText(value: LocalizedText, nativeLang?: string): { en: string; native: string | null } {
  if (typeof value === 'string') return { en: value, native: null };
  const en = value.en ?? '';
  const nativeKey = Object.keys(value).find(k => k !== 'en' && value[k]);
  const native = nativeKey ? (value[nativeKey] ?? null) : null;
  if (nativeKey && nativeLang && nativeKey !== nativeLang) {
    console.warn(`[seed-guidelines] Text language "${nativeKey}" does not match pack language "${nativeLang}".`);
  }
  return { en, native: native ?? null };
}

export async function seedGuidelines(): Promise<void> {
  if (!existsSync(COUNTRY_PACKS_DIR)) {
    console.log('[seed-guidelines] Country packs directory not found, skipping.');
    return;
  }

  const countries = readdirSync(COUNTRY_PACKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  let orgCount = 0;
  let recCount = 0;
  let updatedCount = 0;

  for (const country of countries) {
    const dir = path.join(COUNTRY_PACKS_DIR, country);
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.json') && !NON_GUIDELINE_FILES.has(f));

    const seenRecIds: string[] = [];
    const lastReviewedDates: string[] = [];
    const packCountries = new Set<string>();

    for (const file of files) {
      const filePath = path.join(dir, file);
      let pack: PackFile;
      try {
        pack = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`[seed-guidelines] Failed to parse ${filePath}:`, e);
        continue;
      }
      if (!Array.isArray(pack.organizations) && !Array.isArray(pack.recommendations)) {
        console.log(`[seed-guidelines] Skipping ${filePath}: no organizations or recommendations array.`);
        continue;
      }
      if (pack.language && !/^[a-z]{2,3}(-[a-zA-Z0-9]+)?$/.test(pack.language)) {
        console.warn(`[seed-guidelines] ${filePath}: suspicious language tag "${pack.language}".`);
      }
      if (pack.prevention_category && !PREVENTION_CATEGORIES.includes(pack.prevention_category as never)) {
        console.warn(`[seed-guidelines] ${filePath}: unknown file-level prevention_category "${pack.prevention_category}".`);
      }
      if (pack.last_reviewed) lastReviewedDates.push(pack.last_reviewed);
      if (pack.country) packCountries.add(pack.country);
      for (const rec of pack.recommendations ?? []) packCountries.add(rec.country);

      for (const org of pack.organizations ?? []) {
        const existing = await db.select({ id: schema.guideline_organizations.id })
          .from(schema.guideline_organizations)
          .where(eq(schema.guideline_organizations.id, org.id))
          .limit(1);
        const values = {
          name: org.name,
          abbreviation: org.abbreviation ?? null,
          country: org.country,
          website: org.website ?? null,
          type: org.type ?? null,
        };
        if (existing.length) {
          await db.update(schema.guideline_organizations).set(values)
            .where(eq(schema.guideline_organizations.id, org.id));
        } else {
          await db.insert(schema.guideline_organizations).values({ id: org.id, ...values });
          orgCount++;
        }
      }

      for (const rec of pack.recommendations ?? []) {
        const category = rec.prevention_category ?? pack.prevention_category ?? null;
        if (category && !PREVENTION_CATEGORIES.includes(category as never)) {
          console.warn(`[seed-guidelines] ${rec.id}: unknown prevention_category "${category}".`);
        }
        const title = resolveText(rec.title, pack.language);
        const text = resolveText(rec.recommendation_text, pack.language);
        const summary = resolveText(rec.patient_facing_summary, pack.language);
        const values = {
          organization_id: rec.organization_id,
          country: rec.country,
          topic: rec.topic,
          subtopic: rec.subtopic ?? null,
          module_tags: JSON.stringify(rec.module_tags ?? []),
          title: title.en,
          recommendation_text: text.en,
          patient_facing_summary: summary.en,
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
          title_native: title.native,
          recommendation_text_native: text.native,
          patient_facing_summary_native: summary.native,
          native_language: title.native || text.native || summary.native ? (pack.language ?? null) : null,
          prevention_category: category,
          recommendation_polarity: rec.recommendation_polarity ?? 'for',
          source_file: file,
        };
        const existing = await db.select({ id: schema.guideline_recommendations.id })
          .from(schema.guideline_recommendations)
          .where(eq(schema.guideline_recommendations.id, rec.id))
          .limit(1);
        if (existing.length) {
          await db.update(schema.guideline_recommendations).set(values)
            .where(eq(schema.guideline_recommendations.id, rec.id));
          updatedCount++;
        } else {
          await db.insert(schema.guideline_recommendations).values({
            id: rec.id,
            ...values,
            created_at: new Date().toISOString(),
          });
          recCount++;
        }
        seenRecIds.push(rec.id);
      }
    }

    // Pack files are the source of truth: recs removed from files are deactivated, not deleted
    if (seenRecIds.length && packCountries.size) {
      await db.update(schema.guideline_recommendations)
        .set({ is_active: false })
        .where(and(
          inArray(schema.guideline_recommendations.country, [...packCountries]),
          notInArray(schema.guideline_recommendations.id, seenRecIds),
        ));
    }

    // Any stale file makes the whole pack stale → earliest last_reviewed wins
    if (lastReviewedDates.length) {
      const lastReviewed = lastReviewedDates.sort()[0];
      const existing = await db.select().from(schema.guideline_packs)
        .where(eq(schema.guideline_packs.country, country))
        .limit(1);
      if (existing.length) {
        await db.update(schema.guideline_packs)
          .set({ last_reviewed: lastReviewed, seeded_at: new Date().toISOString() })
          .where(eq(schema.guideline_packs.country, country));
      } else {
        await db.insert(schema.guideline_packs).values({
          country,
          last_reviewed: lastReviewed,
          seeded_at: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`[seed-guidelines] Inserted ${orgCount} orgs, ${recCount} recs; refreshed ${updatedCount} recs.`);
}
