// Canonical shared types for HealthBinder
// Both server and web import from here (or inline-copy for simplicity)

export type SexAtBirth = 'male' | 'female' | 'intersex' | 'unknown';
export type PregnancyStatus = 'pregnant' | 'postpartum' | 'not_pregnant';
export type ConditionStatus =
  | 'active'
  | 'resolved'
  | 'historical'
  | 'possible'
  | 'ruled_out'
  | 'patient_reported'
  | 'conflicting'
  | 'entered_in_error';
export type MedicationStatus = 'current' | 'discontinued' | 'prn' | 'historical';
export type DocumentType =
  | 'discharge_summary'
  | 'office_note'
  | 'lab_report'
  | 'imaging_report'
  | 'prescription'
  | 'other';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type LabInterpretation = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high';
export type ModuleStatusValue = 'off' | 'suggested' | 'on';
export type AllergenType = 'drug' | 'food' | 'environmental' | 'contrast' | 'latex' | 'other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'anaphylaxis' | 'unknown';
export type EncounterType =
  | 'office_visit'
  | 'emergency'
  | 'hospitalization'
  | 'urgent_care'
  | 'telehealth'
  | 'procedure'
  | 'other';
export type VitalType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'temperature'
  | 'weight'
  | 'height'
  | 'bmi'
  | 'o2_sat'
  | 'respiratory_rate'
  | 'blood_glucose'
  | 'other';
export type CareGapType =
  | 'preventive_care'
  | 'lab_followup'
  | 'medication_safety'
  | 'monitoring'
  | 'conflict'
  | 'international';
export type CareGapUrgency = 'routine' | 'soon' | 'urgent';

export interface GuidelineLens {
  default_country: string;
  comparison_countries: string[];
  preferred_organizations: string[];
  display_language: string;
  export_language: string;
  show_foreign_guidelines: boolean;
}

export interface Patient {
  id: string;
  legal_name: string;
  preferred_name?: string;
  date_of_birth: string;
  sex_at_birth: SexAtBirth;
  gender_identity?: string;
  pregnancy_capable: boolean;
  pregnancy_status?: PregnancyStatus;
  country_of_birth: string;
  current_country: string;
  preferred_language: string;
  secondary_languages: string[];
  preferred_guideline_country: string;
  preferred_units: 'metric' | 'imperial';
  preferred_date_format: string;
  guideline_lens: GuidelineLens;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  title: string;
  source_type: 'paste' | 'upload' | 'manual';
  raw_text: string;
  document_type: DocumentType;
  encounter_date?: string;
  facility?: string;
  provider?: string;
  extraction_status: ExtractionStatus;
  created_at: string;
}

export interface ExtractedCondition {
  id: string;
  name: string;
  status: string;
  date?: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractedMedication {
  id: string;
  name: string;
  generic_name?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  status: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractedLab {
  id: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  interpretation?: LabInterpretation;
  date?: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractedAllergy {
  id: string;
  allergen: string;
  reaction?: string;
  severity?: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractedVital {
  id: string;
  vital_type: string;
  value: string;
  unit?: string;
  date?: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractedImaging {
  id: string;
  study_type: string;
  body_part: string;
  findings: string;
  date?: string;
  source_quote: string;
  confidence: number;
  user_confirmed: boolean;
}

export interface ExtractionResult {
  document_id: string;
  conditions: ExtractedCondition[];
  medications: ExtractedMedication[];
  labs: ExtractedLab[];
  allergies: ExtractedAllergy[];
  vitals: ExtractedVital[];
  imaging: ExtractedImaging[];
  contradictions: Array<{ description: string; items: string[] }>;
}

export interface FactConfirmation {
  fact_id: string;
  fact_type: 'condition' | 'medication' | 'lab' | 'allergy' | 'vital' | 'imaging';
  confirmed: boolean;
  edited_data?: Record<string, unknown>;
}

export interface Condition {
  id: string;
  patient_id: string;
  name: string;
  status: ConditionStatus;
  onset_date?: string;
  resolved_date?: string;
  source_document_id?: string;
  source_quote?: string;
  notes?: string;
  user_confirmed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  generic_name?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  indication?: string;
  status: MedicationStatus;
  start_date?: string;
  end_date?: string;
  prescriber?: string;
  pharmacy?: string;
  notes?: string;
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Lab {
  id: string;
  patient_id: string;
  test_name: string;
  value: string;
  numeric_value?: number;
  unit?: string;
  reference_range_low?: number;
  reference_range_high?: number;
  interpretation?: LabInterpretation;
  collection_date: string;
  ordering_provider?: string;
  panel?: string;
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  vital_type: VitalType;
  value: string;
  unit?: string;
  recorded_at: string;
  context?: string;
  source_document_id?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_type: AllergenType;
  reaction?: string;
  severity?: AllergySeverity;
  onset_date?: string;
  status: 'active' | 'inactive' | 'resolved';
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Vaccine {
  id: string;
  patient_id: string;
  vaccine_name: string;
  dose_number?: number;
  administered_date: string;
  lot_number?: string;
  site?: string;
  administered_by?: string;
  facility?: string;
  source_document_id?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  encounter_type: EncounterType;
  facility?: string;
  provider?: string;
  encounter_date: string;
  discharge_date?: string;
  chief_complaint?: string;
  assessment?: string;
  diagnoses?: string[];
  source_document_id?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface ImagingReport {
  id: string;
  patient_id: string;
  study_type: string;
  body_part?: string;
  indication?: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  study_date?: string;
  follow_up_recommended?: boolean;
  follow_up_notes?: string;
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  status: ModuleStatusValue;
  icon: string;
  activation_rules?: object[];
  dependencies?: string[];
  trigger_reason?: string;
}

export interface GuidelineOrganization {
  id: string;
  name: string;
  abbreviation?: string;
  country: string;
  website?: string;
  type?: string;
}

export interface Recommendation {
  id: string;
  organization_id: string;
  organization_name?: string;
  organization_abbreviation?: string;
  country: string;
  topic: string;
  subtopic?: string;
  module_tags: string[];
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
  patient_status: 'applicable' | 'not_applicable' | 'unknown' | 'comparison_only';
  status: 'due' | 'up_to_date' | 'overdue' | 'informational';
}

export interface CareGap {
  id: string;
  gap_type: CareGapType;
  title: string;
  description: string;
  urgency: CareGapUrgency;
  recommendation_id?: string;
  related_condition_id?: string;
  status: 'open' | 'dismissed' | 'resolved';
  detected_at: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Citation {
  fact_type: string;
  fact_id?: string;
  label: string;
  source_quote?: string;
  date?: string;
}

export interface PatientContext {
  demographics: {
    age: number;
    sex_at_birth: SexAtBirth;
    country_of_birth: string;
    current_country: string;
    preferred_language: string;
    pregnancy_status?: PregnancyStatus;
  };
  active_conditions: Array<{ name: string; status: ConditionStatus; onset_date?: string }>;
  current_medications: Array<{ name: string; dose?: string; frequency?: string }>;
  recent_labs: Array<{ test_name: string; value: string; unit?: string; collection_date: string; interpretation?: LabInterpretation }>;
  allergies: Array<{ allergen: string; severity?: AllergySeverity }>;
  active_modules: string[];
  risk_flags: string[];
  care_gaps: Array<{ title: string; urgency: CareGapUrgency }>;
}
