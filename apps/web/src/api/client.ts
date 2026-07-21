import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ── Types ─────────────────────────────────────────────────────────────────────

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
  date_of_birth?: string;
  sex_at_birth: string;
  gender_identity?: string;
  pregnancy_capable: boolean;
  pregnancy_status?: string;
  country_of_birth: string;
  current_country: string;
  preferred_language: string;
  secondary_languages: string[];
  preferred_guideline_country: string;
  preferred_units: string;
  preferred_date_format: string;
  guideline_lens: GuidelineLens;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  title: string;
  source_type: string;
  raw_text?: string;
  document_type: string;
  encounter_date?: string;
  facility?: string;
  provider?: string;
  extraction_status: string;
  created_at: string;
}

export interface ExtractedFact {
  id: string;
  document_id: string;
  fact_type: string;
  raw_data: Record<string, unknown>;
  source_quote?: string;
  confidence?: number;
  user_confirmed: boolean;
  created_at: string;
}

export interface FactConfirmation {
  fact_id: string;
  fact_type: string;
  confirmed: boolean;
  edited_data?: Record<string, unknown>;
}

export interface Condition {
  id: string;
  patient_id: string;
  name: string;
  status: string;
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
  status: string;
  start_date?: string;
  end_date?: string;
  prescriber?: string;
  pharmacy?: string;
  notes?: string;
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
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
  interpretation?: string;
  collection_date: string;
  ordering_provider?: string;
  panel?: string;
  source_document_id?: string;
  source_quote?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface LabExplainerCategory {
  label: string;
  range: string;
  color: 'green' | 'yellow' | 'red';
  meaning: string;
}

export interface LabExplainer {
  id: string;
  name: string;
  aliases: string[];
  what_it_measures: string;
  unit: string;
  normal_range: string;
  categories: LabExplainerCategory[];
  fasting_required: boolean;
  why_ordered: string;
  tips: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  vital_type: string;
  value: string;
  unit?: string;
  recorded_at: string;
  context?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_type: string;
  reaction?: string;
  severity?: string;
  status: string;
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
  facility?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  encounter_type: string;
  facility?: string;
  provider?: string;
  encounter_date: string;
  discharge_date?: string;
  chief_complaint?: string;
  assessment?: string;
  diagnoses?: string[];
  user_confirmed: boolean;
  created_at: string;
}

export interface ImagingExplainer {
  id: string;
  name: string;
  aliases: string[];
  plain_english: string;
  common_in: string[];
  severity: 'low' | 'moderate' | 'high' | 'varies';
  reassurance: string;
  when_to_worry: string;
  what_to_ask: string;
}

export interface ImagingReport {
  id: string;
  patient_id: string;
  study_type: string;
  body_part?: string;
  findings?: string;
  impression?: string;
  study_date?: string;
  follow_up_recommended?: boolean;
  follow_up_notes?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  status: 'off' | 'suggested' | 'on';
  icon: string;
  trigger_reason?: string;
}

export interface Recommendation {
  id: string;
  organization_id?: string;
  country: string;
  topic: string;
  title: string;
  recommendation_text: string;
  patient_facing_summary: string;
  evidence_grade?: string;
  age_min?: number;
  age_max?: number;
  interval_months?: number;
  source_url?: string;
  module_tags: string[];
  patient_status: string;
  status: string;
}

export interface CareGap {
  id: string;
  gap_type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
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
  label: string;
  source_quote?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getHealth = () => api.get<{ status: string; ai_enabled: boolean }>('/health').then(r => r.data);

export const getPatient = () => api.get<Patient>('/patient').then(r => r.data);
export const updatePatient = (data: Partial<Patient>) => api.put<Patient>('/patient', data).then(r => r.data);

export const getDocuments = () => api.get<Document[]>('/documents').then(r => r.data);
export const createDocument = (data: Partial<Document>) => api.post<Document>('/documents', data).then(r => r.data);
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`).then(r => r.data);
export const extractDocument = (id: string) => api.post(`/documents/${id}/extract`).then(r => r.data);
export const getDocumentFacts = (id: string) => api.get<ExtractedFact[]>(`/documents/${id}/facts`).then(r => r.data);
export const confirmFacts = (documentId: string, confirmations: FactConfirmation[]) =>
  api.post(`/documents/${documentId}/confirm`, { confirmations }).then(r => r.data);

export const getConditions = (status?: string) =>
  api.get<Condition[]>('/conditions', { params: status ? { status } : undefined }).then(r => r.data);
export const createCondition = (data: Partial<Condition>) => api.post<Condition>('/conditions', data).then(r => r.data);
export const updateCondition = (id: string, data: Partial<Condition>) => api.put<Condition>(`/conditions/${id}`, data).then(r => r.data);
export const deleteCondition = (id: string) => api.delete(`/conditions/${id}`).then(r => r.data);

export const getMedications = (status?: string) =>
  api.get<Medication[]>('/medications', { params: status ? { status } : undefined }).then(r => r.data);
export const createMedication = (data: Partial<Medication>) => api.post<Medication>('/medications', data).then(r => r.data);
export const updateMedication = (id: string, data: Partial<Medication>) => api.put<Medication>(`/medications/${id}`, data).then(r => r.data);
export const deleteMedication = (id: string) => api.delete(`/medications/${id}`).then(r => r.data);

export const getLabs = (testName?: string) =>
  api.get<Lab[]>('/labs', { params: testName ? { test_name: testName } : undefined }).then(r => r.data);
export const createLab = (data: Partial<Lab>) => api.post<Lab>('/labs', data).then(r => r.data);
export const deleteLab = (id: string) => api.delete(`/labs/${id}`).then(r => r.data);
export const getLabHistory = (testName: string) =>
  api.get<Lab[]>(`/labs/history/${encodeURIComponent(testName)}`).then(r => r.data);
export const getLabExplainer = (testName: string) =>
  api.get<LabExplainer>(`/labs/explain/${encodeURIComponent(testName)}`).then(r => r.data).catch(() => null);

export const getVitals = (type?: string) =>
  api.get<Vital[]>('/vitals', { params: type ? { type } : undefined }).then(r => r.data);
export const createVital = (data: Partial<Vital>) => api.post<Vital>('/vitals', data).then(r => r.data);
export const deleteVital = (id: string) => api.delete(`/vitals/${id}`).then(r => r.data);

export const getAllergies = () => api.get<Allergy[]>('/allergies').then(r => r.data);
export const createAllergy = (data: Partial<Allergy>) => api.post<Allergy>('/allergies', data).then(r => r.data);
export const deleteAllergy = (id: string) => api.delete(`/allergies/${id}`).then(r => r.data);

export const getVaccines = () => api.get<Vaccine[]>('/vaccines').then(r => r.data);
export const createVaccine = (data: Partial<Vaccine>) => api.post<Vaccine>('/vaccines', data).then(r => r.data);
export const deleteVaccine = (id: string) => api.delete(`/vaccines/${id}`).then(r => r.data);

export const getEncounters = () => api.get<Encounter[]>('/encounters').then(r => r.data);
export const createEncounter = (data: Partial<Encounter>) => api.post<Encounter>('/encounters', data).then(r => r.data);
export const deleteEncounter = (id: string) => api.delete(`/encounters/${id}`).then(r => r.data);

export const getImaging = () => api.get<ImagingReport[]>('/imaging').then(r => r.data);
export const createImaging = (data: Partial<ImagingReport>) => api.post<ImagingReport>('/imaging', data).then(r => r.data);
export const deleteImaging = (id: string) => api.delete(`/imaging/${id}`).then(r => r.data);
export const getImagingExplainer = (term: string) =>
  api.get<ImagingExplainer>(`/imaging/explain/${encodeURIComponent(term)}`).then(r => r.data).catch(() => null);

export const getModules = () => api.get<ModuleConfig[]>('/modules').then(r => r.data);
export const enableModule = (id: string) => api.post(`/modules/${id}/enable`).then(r => r.data);
export const disableModule = (id: string) => api.post(`/modules/${id}/disable`).then(r => r.data);

export interface GuidelinePack {
  country: string;
  last_reviewed: string;
  seeded_at: string;
}

export const getGuidelinePacks = () => api.get<GuidelinePack[]>('/guideline-packs').then(r => r.data);
export const getGuidelines = () => api.get<Recommendation[]>('/guidelines').then(r => r.data);
export const getCareGaps = () => api.get<CareGap[]>('/care-gaps').then(r => r.data);
export const dismissCareGap = (id: string) => api.post(`/care-gaps/${id}/dismiss`).then(r => r.data);

export const getChatHistory = () => api.get<ChatMessage[]>('/chat').then(r => r.data);
export const sendChat = (message: string, history: ChatMessage[]) =>
  api.post<{ answer: string; citations: Citation[] }>('/chat', { message, history }).then(r => r.data);
export const clearChat = () => api.delete('/chat').then(r => r.data);

export interface AIConfigResponse {
  enabled: boolean;
  provider: string;
  base_url: string;
  api_key_set: boolean;
  extraction_model: string;
  chat_model: string;
}

export interface AIConfigUpdate {
  enabled: boolean;
  provider: string;
  base_url: string;
  api_key?: string;
  extraction_model: string;
  chat_model: string;
}

export const getAIConfig = () => api.get<AIConfigResponse>('/ai-config').then(r => r.data);
export const updateAIConfig = (data: AIConfigUpdate) => api.put<{ ok: boolean }>('/ai-config', data).then(r => r.data);

export interface VisitPrepExport {
  patient: Patient;
  conditions: Condition[];
  medications: Medication[];
  allergies: Allergy[];
  abnormal_labs: Lab[];
  care_gaps: CareGap[];
}

export interface HandoffExport {
  patient: Patient;
  conditions: Condition[];
  medications: Medication[];
  allergies: Allergy[];
  labs_latest: Lab[];
  vitals: Vital[];
  vaccines: Vaccine[];
  encounters: Encounter[];
  care_gaps: CareGap[];
  generated_at: string;
}

export const getVisitPrepExport = () => api.get<VisitPrepExport>('/export/visit-prep').then(r => r.data);
export const getHandoffExport = () => api.get<HandoffExport>('/export/handoff').then(r => r.data);

// ── Workstream B: discrete clinical tools ─────────────────────────────────────

export interface Supplement {
  id: string;
  patient_id: string;
  name: string;
  dose?: string | null;
  unit?: string | null;
  frequency?: string | null;
  brand?: string | null;
  reason?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  notes?: string | null;
  user_confirmed: boolean;
  created_at: string;
  updated_at?: string;
}

export const getSupplements = () => api.get<Supplement[]>('/supplements').then(r => r.data);
export const createSupplement = (data: Partial<Supplement>) => api.post<Supplement>('/supplements', data).then(r => r.data);
export const updateSupplement = (id: string, data: Partial<Supplement>) => api.patch<Supplement>(`/supplements/${id}`, data).then(r => r.data);
export const deleteSupplement = (id: string) => api.delete(`/supplements/${id}`).then(r => r.data);

export interface IllnessEpisode {
  id: string;
  patient_id: string;
  title: string;
  symptoms_json?: string;
  onset_date?: string | null;
  end_date?: string | null;
  severity?: string | null;
  treatments?: string | null;
  outcome?: string | null;
  notes?: string | null;
  user_confirmed: boolean;
  created_at: string;
  updated_at?: string;
}

export const getIllnessEpisodes = () => api.get<IllnessEpisode[]>('/illness-episodes').then(r => r.data);
export const createIllnessEpisode = (data: Omit<Partial<IllnessEpisode>, 'symptoms_json'> & { symptoms_json?: unknown }) => api.post<IllnessEpisode>('/illness-episodes', data).then(r => r.data);
export const updateIllnessEpisode = (id: string, data: Omit<Partial<IllnessEpisode>, 'symptoms_json'> & { symptoms_json?: unknown }) => api.patch<IllnessEpisode>(`/illness-episodes/${id}`, data).then(r => r.data);
export const deleteIllnessEpisode = (id: string) => api.delete(`/illness-episodes/${id}`).then(r => r.data);

export interface MedAdminLogEntry {
  id: string;
  patient_id: string;
  medication_id?: string | null;
  medication_name: string;
  administered_at: string;
  dose_given?: string | null;
  route?: string | null;
  note?: string | null;
  created_at: string;
}

export const getMedAdminLog = () => api.get<MedAdminLogEntry[]>('/med-admin-log').then(r => r.data);
export const createMedAdminLog = (data: Partial<MedAdminLogEntry>) => api.post<MedAdminLogEntry>('/med-admin-log', data).then(r => r.data);
export const updateMedAdminLog = (id: string, data: Partial<MedAdminLogEntry>) => api.patch<MedAdminLogEntry>(`/med-admin-log/${id}`, data).then(r => r.data);
export const deleteMedAdminLog = (id: string) => api.delete(`/med-admin-log/${id}`).then(r => r.data);

export interface Attachment {
  id: string;
  patient_id: string;
  entity_type?: string | null;
  entity_id?: string | null;
  mime_type: string;
  filename: string;
  file_path: string;
  thumbnail_path?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  caption?: string | null;
  created_at: string;
}

export interface AttachmentUploadOpts {
  entity_type?: string;
  entity_id?: string;
  caption?: string;
  taken_at?: string;
}

export const getAttachments = () => api.get<Attachment[]>('/attachments').then(r => r.data);
export const uploadAttachment = (file: File, opts: AttachmentUploadOpts = {}) => {
  const form = new FormData();
  form.append('file', file);
  if (opts.entity_type) form.append('entity_type', opts.entity_type);
  if (opts.entity_id) form.append('entity_id', opts.entity_id);
  if (opts.caption) form.append('caption', opts.caption);
  if (opts.taken_at) form.append('taken_at', opts.taken_at);
  return api.post<Attachment>('/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const updateAttachment = (id: string, data: Partial<Attachment>) => api.patch<Attachment>(`/attachments/${id}`, data).then(r => r.data);
export const deleteAttachment = (id: string) => api.delete(`/attachments/${id}`).then(r => r.data);
export const getAttachmentUrl = (id: string) => `/api/attachments/${id}/raw`;

export interface Reminder {
  id: string;
  patient_id: string;
  kind: string;
  title: string;
  body?: string | null;
  target_entity_type?: string | null;
  target_entity_id?: string | null;
  prevention_category?: string | null;
  due_at?: string | null;
  snoozed_until?: string | null;
  dismissed_at?: string | null;
  completed_at?: string | null;
  payload_json?: string;
  created_at: string;
  updated_at?: string;
}

export const getReminders = () => api.get<Reminder[]>('/reminders').then(r => r.data);
export const createReminder = (data: Omit<Partial<Reminder>, 'payload_json'> & { payload_json?: unknown }) => api.post<Reminder>('/reminders', data).then(r => r.data);
export const updateReminder = (id: string, data: Omit<Partial<Reminder>, 'payload_json'> & { payload_json?: unknown }) => api.patch<Reminder>(`/reminders/${id}`, data).then(r => r.data);
export const deleteReminder = (id: string) => api.delete(`/reminders/${id}`).then(r => r.data);
export const completeReminder = (id: string) => api.post<Reminder>(`/reminders/${id}/complete`).then(r => r.data);
export const dismissReminder = (id: string) => api.post<Reminder>(`/reminders/${id}/dismiss`).then(r => r.data);
export const snoozeReminder = (id: string, until: string) => api.post<Reminder>(`/reminders/${id}/snooze`, { until }).then(r => r.data);

// ── Workstream B Batch 2: body history & event tools ──────────────────────────

export interface Surgery {
  id: string; patient_id: string;
  name: string;
  surgery_date?: string | null;
  surgeon?: string | null; facility?: string | null;
  indication?: string | null; approach?: string | null;
  complications_text?: string | null; recovery_notes?: string | null;
  related_condition_id?: string | null;
  created_at: string; updated_at?: string;
}
export const getSurgeries = () => api.get<Surgery[]>('/surgeries').then(r => r.data);
export const createSurgery = (data: Partial<Surgery>) => api.post<Surgery>('/surgeries', data).then(r => r.data);
export const updateSurgery = (id: string, data: Partial<Surgery>) => api.patch<Surgery>(`/surgeries/${id}`, data).then(r => r.data);
export const deleteSurgery = (id: string) => api.delete(`/surgeries/${id}`).then(r => r.data);

export interface Implant {
  id: string; patient_id: string;
  kind: string; name: string;
  body_site?: string | null; laterality?: string | null;
  manufacturer?: string | null; model?: string | null;
  serial?: string | null; lot?: string | null;
  placed_date?: string | null; removed_date?: string | null;
  removal_reason?: string | null; mri_safety?: string | null;
  photo_attachment_id?: string | null; notes?: string | null;
  created_at: string; updated_at?: string;
}
export const getImplants = () => api.get<Implant[]>('/implants').then(r => r.data);
export const createImplant = (data: Partial<Implant>) => api.post<Implant>('/implants', data).then(r => r.data);
export const updateImplant = (id: string, data: Partial<Implant>) => api.patch<Implant>(`/implants/${id}`, data).then(r => r.data);
export const deleteImplant = (id: string) => api.delete(`/implants/${id}`).then(r => r.data);

export interface Equipment {
  id: string; patient_id: string;
  kind: string;
  brand?: string | null; model?: string | null; serial?: string | null;
  acquired_date?: string | null; retired_date?: string | null;
  last_serviced_date?: string | null; notes?: string | null;
  created_at: string; updated_at?: string;
}
export const getEquipment = () => api.get<Equipment[]>('/equipment').then(r => r.data);
export const createEquipment = (data: Partial<Equipment>) => api.post<Equipment>('/equipment', data).then(r => r.data);
export const updateEquipment = (id: string, data: Partial<Equipment>) => api.patch<Equipment>(`/equipment/${id}`, data).then(r => r.data);
export const deleteEquipment = (id: string) => api.delete(`/equipment/${id}`).then(r => r.data);

export interface Sensitivity {
  id: string; patient_id: string;
  substance: string; kind?: string | null;
  reaction?: string | null; severity?: string | null;
  onset_date?: string | null; confirmed_by?: string | null; notes?: string | null;
  created_at: string; updated_at?: string;
}
export const getSensitivities = () => api.get<Sensitivity[]>('/sensitivities').then(r => r.data);
export const createSensitivity = (data: Partial<Sensitivity>) => api.post<Sensitivity>('/sensitivities', data).then(r => r.data);
export const updateSensitivity = (id: string, data: Partial<Sensitivity>) => api.patch<Sensitivity>(`/sensitivities/${id}`, data).then(r => r.data);
export const deleteSensitivity = (id: string) => api.delete(`/sensitivities/${id}`).then(r => r.data);

export interface SexEvent {
  id: string; patient_id: string;
  occurred_at: string;
  kind?: string | null; partner_type?: string | null; protection?: string | null;
  pregnancy_risk?: string | null; notes?: string | null;
  created_at: string;
}
export const getSexEvents = () => api.get<SexEvent[]>('/sex-events').then(r => r.data);
export const createSexEvent = (data: Partial<SexEvent>) => api.post<SexEvent>('/sex-events', data).then(r => r.data);
export const updateSexEvent = (id: string, data: Partial<SexEvent>) => api.patch<SexEvent>(`/sex-events/${id}`, data).then(r => r.data);
export const deleteSexEvent = (id: string) => api.delete(`/sex-events/${id}`).then(r => r.data);

export interface PregnancyOutcome {
  id: string; patient_id: string;
  pregnancy_id?: string | null; conception_date_est?: string | null;
  outcome: string; outcome_date: string;
  gestational_age_at_outcome?: string | null;
  treatment?: string | null;
  hcg_followup_json?: string;
  emotional_notes?: string | null; future_planning_notes?: string | null;
  created_at: string; updated_at?: string;
}
export const getPregnancyOutcomes = () => api.get<PregnancyOutcome[]>('/pregnancy-outcomes').then(r => r.data);
export const createPregnancyOutcome = (data: Omit<Partial<PregnancyOutcome>, 'hcg_followup_json'> & { hcg_followup_json?: unknown }) => api.post<PregnancyOutcome>('/pregnancy-outcomes', data).then(r => r.data);
export const updatePregnancyOutcome = (id: string, data: Omit<Partial<PregnancyOutcome>, 'hcg_followup_json'> & { hcg_followup_json?: unknown }) => api.patch<PregnancyOutcome>(`/pregnancy-outcomes/${id}`, data).then(r => r.data);
export const deletePregnancyOutcome = (id: string) => api.delete(`/pregnancy-outcomes/${id}`).then(r => r.data);

export interface Ultrasound {
  id: string; patient_id: string;
  performed_at: string;
  organ_or_site: string;
  indication?: string | null; findings?: string | null;
  dimensions_json?: string;
  sonographer?: string | null; facility?: string | null;
  related_imaging_report_id?: string | null; photo_attachment_id?: string | null;
  created_at: string; updated_at?: string;
}
export const getUltrasounds = () => api.get<Ultrasound[]>('/ultrasounds').then(r => r.data);
export const createUltrasound = (data: Omit<Partial<Ultrasound>, 'dimensions_json'> & { dimensions_json?: unknown }) => api.post<Ultrasound>('/ultrasounds', data).then(r => r.data);
export const updateUltrasound = (id: string, data: Omit<Partial<Ultrasound>, 'dimensions_json'> & { dimensions_json?: unknown }) => api.patch<Ultrasound>(`/ultrasounds/${id}`, data).then(r => r.data);
export const deleteUltrasound = (id: string) => api.delete(`/ultrasounds/${id}`).then(r => r.data);

export interface Micronutrient {
  id: string; patient_id: string;
  nutrient: string; value: number; unit?: string | null;
  measured_at: string;
  lab_source?: string | null;
  ref_low?: number | null; ref_high?: number | null;
  optimal_low?: number | null; optimal_high?: number | null;
  supplementation_active?: boolean;
  source_lab_id?: string | null; notes?: string | null;
  created_at: string;
}
export const getMicronutrients = (nutrient?: string) => api.get<Micronutrient[]>('/micronutrients', { params: nutrient ? { nutrient } : undefined }).then(r => r.data);
export const createMicronutrient = (data: Partial<Micronutrient>) => api.post<Micronutrient>('/micronutrients', data).then(r => r.data);
export const updateMicronutrient = (id: string, data: Partial<Micronutrient>) => api.patch<Micronutrient>(`/micronutrients/${id}`, data).then(r => r.data);
export const deleteMicronutrient = (id: string) => api.delete(`/micronutrients/${id}`).then(r => r.data);

export interface AccessDevice {
  id: string; patient_id: string;
  kind: string; subtype?: string | null;
  anatomical_site?: string | null; laterality?: string | null;
  placed_at?: string | null; placed_by?: string | null; placed_facility?: string | null;
  indication?: string | null; gauge_or_size?: string | null; lumens?: number | null;
  removed_at?: string | null; removal_reason?: string | null; complications_text?: string | null;
  dressing_change_interval_days?: number | null;
  last_dressing_change_at?: string | null;
  line_care_notes_markdown?: string | null;
  photo_attachment_id?: string | null;
  related_condition_id?: string | null;
  created_at: string; updated_at?: string;
}
export const getAccessDevices = () => api.get<AccessDevice[]>('/access-devices').then(r => r.data);
export const createAccessDevice = (data: Partial<AccessDevice>) => api.post<AccessDevice>('/access-devices', data).then(r => r.data);
export const updateAccessDevice = (id: string, data: Partial<AccessDevice>) => api.patch<AccessDevice>(`/access-devices/${id}`, data).then(r => r.data);
export const deleteAccessDevice = (id: string) => api.delete(`/access-devices/${id}`).then(r => r.data);
