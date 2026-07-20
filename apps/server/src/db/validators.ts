import { z } from 'zod';
import type { Context } from 'hono';

const isoDate = z.string().min(1);
const isoDateOpt = z.string().min(1).optional().nullable();

export const documentCreateSchema = z.object({
  title: z.string().min(1).optional(),
  source_type: z.enum(['paste', 'upload', 'fhir', 'ccda', 'photo']).optional(),
  raw_text: z.string().optional(),
  document_type: z.string().optional(),
  encounter_date: isoDateOpt,
  facility: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
});

export const documentConfirmSchema = z.object({
  confirmations: z.array(z.object({
    fact_id: z.string().min(1),
    fact_type: z.enum(['condition', 'medication', 'lab', 'allergy', 'vital', 'imaging']),
    confirmed: z.boolean(),
    edited_data: z.record(z.unknown()).optional(),
  })),
});

const baseConditionShape = {
  name: z.string().min(1),
  status: z.enum(['active', 'resolved', 'historical', 'possible', 'ruled_out']).optional(),
  onset_date: isoDateOpt,
  resolved_date: isoDateOpt,
  notes: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
};
export const conditionCreateSchema = z.object(baseConditionShape);
export const conditionUpdateSchema = z.object(baseConditionShape).partial();

const baseMedicationShape = {
  name: z.string().min(1),
  generic_name: z.string().optional().nullable(),
  dose: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  status: z.enum(['current', 'discontinued', 'prn', 'historical']).optional(),
  start_date: isoDateOpt,
  end_date: isoDateOpt,
  prescriber: z.string().optional().nullable(),
  pharmacy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
};
export const medicationCreateSchema = z.object(baseMedicationShape);
export const medicationUpdateSchema = z.object(baseMedicationShape).partial();

export const labCreateSchema = z.object({
  test_name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional().nullable(),
  reference_range_low: z.number().optional().nullable(),
  reference_range_high: z.number().optional().nullable(),
  interpretation: z.string().optional().nullable(),
  collection_date: isoDate,
  ordering_provider: z.string().optional().nullable(),
  panel: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
});

export const vitalCreateSchema = z.object({
  vital_type: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional().nullable(),
  recorded_at: isoDate,
  context: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
});

export const allergyCreateSchema = z.object({
  allergen: z.string().min(1),
  allergen_type: z.enum(['drug', 'food', 'environmental', 'other']).optional(),
  reaction: z.string().optional().nullable(),
  severity: z.enum(['mild', 'moderate', 'severe', 'anaphylaxis']).optional().nullable(),
  onset_date: isoDateOpt,
  status: z.enum(['active', 'resolved']).optional(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
});

export const vaccineCreateSchema = z.object({
  vaccine_name: z.string().min(1),
  dose_number: z.number().int().optional().nullable(),
  administered_date: isoDate,
  lot_number: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  administered_by: z.string().optional().nullable(),
  facility: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
});

export const encounterCreateSchema = z.object({
  encounter_type: z.string().optional(),
  facility: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  encounter_date: isoDate,
  discharge_date: isoDateOpt,
  chief_complaint: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  diagnoses: z.array(z.string()).optional(),
  source_document_id: z.string().optional().nullable(),
});

export const imagingCreateSchema = z.object({
  study_type: z.string().min(1),
  body_part: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  impression: z.string().optional().nullable(),
  radiologist: z.string().optional().nullable(),
  study_date: isoDateOpt,
  follow_up_recommended: z.boolean().optional(),
  follow_up_notes: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
});

export const patientUpdateSchema = z.object({
  legal_name: z.string().min(1).optional(),
  preferred_name: z.string().optional().nullable(),
  date_of_birth: isoDateOpt,
  sex_at_birth: z.enum(['male', 'female', 'intersex', 'unknown']).optional(),
  gender_identity: z.string().optional().nullable(),
  pregnancy_capable: z.boolean().optional(),
  pregnancy_status: z.string().optional().nullable(),
  country_of_birth: z.string().optional(),
  current_country: z.string().optional(),
  preferred_language: z.string().optional(),
  secondary_languages: z.union([z.array(z.string()), z.string()]).optional(),
  preferred_guideline_country: z.string().optional(),
  preferred_units: z.enum(['metric', 'imperial']).optional(),
  preferred_date_format: z.string().optional(),
  guideline_lens: z.union([z.record(z.unknown()), z.string()]).optional(),
}).partial();

export const aiConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().optional(),
  base_url: z.string().url().optional(),
  api_key: z.string().optional().nullable(),
  extraction_model: z.string().optional(),
  chat_model: z.string().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

const baseSupplementShape = {
  name: z.string().min(1),
  dose: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  start_date: isoDateOpt,
  end_date: isoDateOpt,
  status: z.enum(['current', 'discontinued', 'historical']).optional(),
  notes: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
  source_quote: z.string().optional().nullable(),
};
export const supplementCreateSchema = z.object(baseSupplementShape);
export const supplementUpdateSchema = z.object(baseSupplementShape).partial();

const baseIllnessShape = {
  title: z.string().min(1),
  symptoms_json: z.union([z.array(z.unknown()), z.record(z.unknown()), z.string()]).optional(),
  onset_date: isoDateOpt,
  end_date: isoDateOpt,
  severity: z.string().optional().nullable(),
  treatments: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
};
export const illnessCreateSchema = z.object(baseIllnessShape);
export const illnessUpdateSchema = z.object(baseIllnessShape).partial();

const baseMedAdminShape = {
  medication_id: z.string().optional().nullable(),
  medication_name: z.string().min(1),
  administered_at: isoDate,
  dose_given: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
};
export const medAdminCreateSchema = z.object(baseMedAdminShape);
export const medAdminUpdateSchema = z.object(baseMedAdminShape).partial();

const baseAttachmentShape = {
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  taken_at: isoDateOpt,
};
export const attachmentUpdateSchema = z.object(baseAttachmentShape).partial();

const baseReminderShape = {
  kind: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional().nullable(),
  target_entity_type: z.string().optional().nullable(),
  target_entity_id: z.string().optional().nullable(),
  prevention_category: z.string().optional().nullable(),
  due_at: isoDateOpt,
  snoozed_until: isoDateOpt,
  payload_json: z.union([z.array(z.unknown()), z.record(z.unknown()), z.string()]).optional(),
};
export const reminderCreateSchema = z.object(baseReminderShape);
export const reminderUpdateSchema = z.object(baseReminderShape).partial();

export const reminderSnoozeSchema = z.object({ until: isoDate });

// ── Workstream B Batch 2: body history & event tools ────────────────────────

const baseSurgeryShape = {
  name: z.string().min(1),
  surgery_date: isoDateOpt,
  surgeon: z.string().optional().nullable(),
  facility: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  approach: z.string().optional().nullable(),
  complications_text: z.string().optional().nullable(),
  recovery_notes: z.string().optional().nullable(),
  related_condition_id: z.string().optional().nullable(),
  source_document_id: z.string().optional().nullable(),
};
export const surgeryCreateSchema = z.object(baseSurgeryShape);
export const surgeryUpdateSchema = z.object(baseSurgeryShape).partial();

const baseImplantShape = {
  kind: z.string().min(1),
  name: z.string().min(1),
  body_site: z.string().optional().nullable(),
  laterality: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial: z.string().optional().nullable(),
  lot: z.string().optional().nullable(),
  placed_date: isoDateOpt,
  removed_date: isoDateOpt,
  removal_reason: z.string().optional().nullable(),
  mri_safety: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const implantCreateSchema = z.object(baseImplantShape);
export const implantUpdateSchema = z.object(baseImplantShape).partial();

const baseEquipmentShape = {
  kind: z.string().min(1),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial: z.string().optional().nullable(),
  acquired_date: isoDateOpt,
  retired_date: isoDateOpt,
  last_serviced_date: isoDateOpt,
  notes: z.string().optional().nullable(),
};
export const equipmentCreateSchema = z.object(baseEquipmentShape);
export const equipmentUpdateSchema = z.object(baseEquipmentShape).partial();

const baseSensitivityShape = {
  substance: z.string().min(1),
  kind: z.string().optional(),
  reaction: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  onset_date: isoDateOpt,
  confirmed_by: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const sensitivityCreateSchema = z.object(baseSensitivityShape);
export const sensitivityUpdateSchema = z.object(baseSensitivityShape).partial();

const baseSexEventShape = {
  occurred_at: isoDate,
  kind: z.string().optional().nullable(),
  partner_type: z.string().optional().nullable(),
  protection: z.string().optional().nullable(),
  pregnancy_risk: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const sexEventCreateSchema = z.object(baseSexEventShape);
export const sexEventUpdateSchema = z.object(baseSexEventShape).partial();

const basePregnancyOutcomeShape = {
  pregnancy_id: z.string().optional().nullable(),
  conception_date_est: isoDateOpt,
  outcome: z.string().min(1),
  outcome_date: isoDate,
  gestational_age_at_outcome: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  hcg_followup_json: z.union([z.array(z.unknown()), z.record(z.unknown()), z.string()]).optional(),
  emotional_notes: z.string().optional().nullable(),
  future_planning_notes: z.string().optional().nullable(),
};
export const pregnancyOutcomeCreateSchema = z.object(basePregnancyOutcomeShape);
export const pregnancyOutcomeUpdateSchema = z.object(basePregnancyOutcomeShape).partial();

const baseUltrasoundShape = {
  performed_at: isoDate,
  organ_or_site: z.string().min(1),
  indication: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  dimensions_json: z.union([z.record(z.unknown()), z.string()]).optional(),
  sonographer: z.string().optional().nullable(),
  facility: z.string().optional().nullable(),
  related_imaging_report_id: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
};
export const ultrasoundCreateSchema = z.object(baseUltrasoundShape);
export const ultrasoundUpdateSchema = z.object(baseUltrasoundShape).partial();

const baseMicronutrientShape = {
  nutrient: z.string().min(1),
  value: z.number(),
  unit: z.string().optional().nullable(),
  measured_at: isoDate,
  lab_source: z.string().optional().nullable(),
  ref_low: z.number().optional().nullable(),
  ref_high: z.number().optional().nullable(),
  optimal_low: z.number().optional().nullable(),
  optimal_high: z.number().optional().nullable(),
  supplementation_active: z.boolean().optional(),
  source_lab_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const micronutrientCreateSchema = z.object(baseMicronutrientShape);
export const micronutrientUpdateSchema = z.object(baseMicronutrientShape).partial();

const baseAccessDeviceShape = {
  kind: z.string().min(1),
  subtype: z.string().optional().nullable(),
  anatomical_site: z.string().optional().nullable(),
  laterality: z.string().optional().nullable(),
  placed_at: isoDateOpt,
  placed_by: z.string().optional().nullable(),
  placed_facility: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  gauge_or_size: z.string().optional().nullable(),
  lumens: z.number().int().optional().nullable(),
  removed_at: isoDateOpt,
  removal_reason: z.string().optional().nullable(),
  complications_text: z.string().optional().nullable(),
  dressing_change_interval_days: z.number().int().optional().nullable(),
  last_dressing_change_at: isoDateOpt,
  line_care_notes_markdown: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
  related_condition_id: z.string().optional().nullable(),
};
export const accessDeviceCreateSchema = z.object(baseAccessDeviceShape);
export const accessDeviceUpdateSchema = z.object(baseAccessDeviceShape).partial();

// ── Workstream B Batch 3: pregnancy/reproductive tools ──────────────────────

const baseKickSessionShape = {
  started_at: isoDate,
  ended_at: isoDateOpt,
  count: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
};
export const kickSessionCreateSchema = z.object(baseKickSessionShape);
export const kickSessionUpdateSchema = z.object(baseKickSessionShape).partial();

const baseContractionShape = {
  started_at: isoDate,
  ended_at: isoDateOpt,
  intensity: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const contractionCreateSchema = z.object(baseContractionShape);
export const contractionUpdateSchema = z.object(baseContractionShape).partial();

const basePregnancyShape = {
  lmp_date: isoDateOpt,
  edd: isoDateOpt,
  conception_method: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'ended']).optional(),
  outcome: z.string().optional().nullable(),
  outcome_date: isoDateOpt,
  notes: z.string().optional().nullable(),
};
export const pregnancyCreateSchema = z.object(basePregnancyShape);
export const pregnancyUpdateSchema = z.object(basePregnancyShape).partial();

const baseScreeningResponseShape = {
  instrument: z.string().min(1),
  responses_json: z.union([z.array(z.unknown()), z.record(z.unknown()), z.string()]).optional(),
  total_score: z.number().optional().nullable(),
  interpretation: z.string().optional().nullable(),
  completed_at: isoDate,
  notes: z.string().optional().nullable(),
};
export const screeningResponseCreateSchema = z.object(baseScreeningResponseShape);
export const screeningResponseUpdateSchema = z.object(baseScreeningResponseShape).partial();

const baseBirthPlanShape = {
  title: z.string().optional(),
  plan_json: z.union([z.record(z.unknown()), z.string()]).optional(),
  finalized_at: isoDateOpt,
};
export const birthPlanCreateSchema = z.object(baseBirthPlanShape);
export const birthPlanUpdateSchema = z.object(baseBirthPlanShape).partial();

const baseFeedingEventShape = {
  started_at: isoDate,
  ended_at: isoDateOpt,
  side: z.string().optional().nullable(),
  volume_ml: z.number().optional().nullable(),
  kind: z.string().optional(),
  notes: z.string().optional().nullable(),
};
export const feedingEventCreateSchema = z.object(baseFeedingEventShape);
export const feedingEventUpdateSchema = z.object(baseFeedingEventShape).partial();

const baseJaundiceShape = {
  infant_dob: isoDate,
  observed_at: isoDate,
  day_of_life: z.number().int().optional().nullable(),
  area_affected: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
};
export const jaundiceCreateSchema = z.object(baseJaundiceShape);
export const jaundiceUpdateSchema = z.object(baseJaundiceShape).partial();

const baseDialysisShape = {
  session_date: isoDate,
  duration_min: z.number().int().optional().nullable(),
  access_site: z.string().optional().nullable(),
  pre_weight: z.number().optional().nullable(),
  post_weight: z.number().optional().nullable(),
  uf_goal: z.number().optional().nullable(),
  uf_achieved: z.number().optional().nullable(),
  complications_text: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const dialysisCreateSchema = z.object(baseDialysisShape);
export const dialysisUpdateSchema = z.object(baseDialysisShape).partial();

const baseCycleShape = {
  started_at: isoDate,
  ended_at: isoDateOpt,
  notes: z.string().optional().nullable(),
};
export const cycleCreateSchema = z.object(baseCycleShape);
export const cycleUpdateSchema = z.object(baseCycleShape).partial();

const baseCycleDayShape = {
  cycle_id: z.string().min(1),
  day_of_cycle: z.number().int().min(1),
  date: isoDate,
  bbt: z.number().optional().nullable(),
  cervical_mucus_kind: z.string().optional().nullable(),
  cervical_position: z.string().optional().nullable(),
  bleeding_kind: z.string().optional().nullable(),
  bleeding_amount: z.string().optional().nullable(),
  ovulation_pain: z.boolean().optional(),
  intercourse: z.boolean().optional(),
  notes: z.string().optional().nullable(),
};
export const cycleDayCreateSchema = z.object(baseCycleDayShape);
export const cycleDayUpdateSchema = z.object(baseCycleDayShape).partial();

const baseLhTestShape = {
  cycle_id: z.string().optional().nullable(),
  taken_at: isoDate,
  result: z.string().optional().nullable(),
  intensity: z.number().int().optional().nullable(),
  brand: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const lhTestCreateSchema = z.object(baseLhTestShape);
export const lhTestUpdateSchema = z.object(baseLhTestShape).partial();

const basePregnancyTestShape = {
  taken_at: isoDate,
  result: z.string().optional().nullable(),
  kind: z.string().optional().nullable(),
  photo_attachment_id: z.string().optional().nullable(),
  follow_up_hcg_quantitative: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
};
export const pregnancyTestCreateSchema = z.object(basePregnancyTestShape);
export const pregnancyTestUpdateSchema = z.object(basePregnancyTestShape).partial();

// ── Workstream B Batch 4: mind/experiential tools ───────────────────────────

const baseMoodEntryShape = {
  logged_at: isoDate,
  mood_score: z.number().int().min(1).max(10).optional().nullable(),
  energy_score: z.number().int().min(1).max(10).optional().nullable(),
  anxiety_score: z.number().int().min(1).max(10).optional().nullable(),
  irritability_score: z.number().int().min(1).max(10).optional().nullable(),
  tags_json: z.union([z.array(z.string()), z.string()]).optional(),
  notes_markdown: z.string().optional().nullable(),
};
export const moodEntryCreateSchema = z.object(baseMoodEntryShape);
export const moodEntryUpdateSchema = z.object(baseMoodEntryShape).partial();

const baseExperimentShape = {
  hypothesis: z.string().min(1),
  started_at: isoDateOpt,
  ended_at: isoDateOpt,
  baseline_period_days: z.number().int().optional().nullable(),
  intervention_period_days: z.number().int().optional().nullable(),
  intervention_description: z.string().optional().nullable(),
  target_metrics_json: z.union([z.array(z.unknown()), z.string()]).optional(),
  status: z.enum(['planned', 'baseline', 'intervention', 'completed', 'abandoned']).optional(),
  conclusion_markdown: z.string().optional().nullable(),
};
export const experimentCreateSchema = z.object(baseExperimentShape);
export const experimentUpdateSchema = z.object(baseExperimentShape).partial();

export type ValidationError = { error: 'validation_failed'; issues: { path: string; message: string }[] };

export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ error: 'invalid_json' }, 400) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    const body: ValidationError = { error: 'validation_failed', issues };
    return { ok: false, response: c.json(body, 400) };
  }
  return { ok: true, data: result.data };
}
