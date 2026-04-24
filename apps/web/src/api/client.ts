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

export const getLabs = (testName?: string) =>
  api.get<Lab[]>('/labs', { params: testName ? { test_name: testName } : undefined }).then(r => r.data);
export const createLab = (data: Partial<Lab>) => api.post<Lab>('/labs', data).then(r => r.data);
export const getLabHistory = (testName: string) =>
  api.get<Lab[]>(`/labs/history/${encodeURIComponent(testName)}`).then(r => r.data);
export const getLabExplainer = (testName: string) =>
  api.get<LabExplainer>(`/labs/explain/${encodeURIComponent(testName)}`).then(r => r.data).catch(() => null);

export const getVitals = (type?: string) =>
  api.get<Vital[]>('/vitals', { params: type ? { type } : undefined }).then(r => r.data);
export const createVital = (data: Partial<Vital>) => api.post<Vital>('/vitals', data).then(r => r.data);

export const getAllergies = () => api.get<Allergy[]>('/allergies').then(r => r.data);
export const createAllergy = (data: Partial<Allergy>) => api.post<Allergy>('/allergies', data).then(r => r.data);
export const deleteAllergy = (id: string) => api.delete(`/allergies/${id}`).then(r => r.data);

export const getVaccines = () => api.get<Vaccine[]>('/vaccines').then(r => r.data);
export const createVaccine = (data: Partial<Vaccine>) => api.post<Vaccine>('/vaccines', data).then(r => r.data);

export const getEncounters = () => api.get<Encounter[]>('/encounters').then(r => r.data);
export const createEncounter = (data: Partial<Encounter>) => api.post<Encounter>('/encounters', data).then(r => r.data);

export const getImaging = () => api.get<ImagingReport[]>('/imaging').then(r => r.data);
export const createImaging = (data: Partial<ImagingReport>) => api.post<ImagingReport>('/imaging', data).then(r => r.data);
export const getImagingExplainer = (term: string) =>
  api.get<ImagingExplainer>(`/imaging/explain/${encodeURIComponent(term)}`).then(r => r.data).catch(() => null);

export const getModules = () => api.get<ModuleConfig[]>('/modules').then(r => r.data);
export const enableModule = (id: string) => api.post(`/modules/${id}/enable`).then(r => r.data);
export const disableModule = (id: string) => api.post(`/modules/${id}/disable`).then(r => r.data);

export const getGuidelines = () => api.get<Recommendation[]>('/guidelines').then(r => r.data);
export const getCareGaps = () => api.get<CareGap[]>('/care-gaps').then(r => r.data);
export const dismissCareGap = (id: string) => api.post(`/care-gaps/${id}/dismiss`).then(r => r.data);

export const getChatHistory = () => api.get<ChatMessage[]>('/chat').then(r => r.data);
export const sendChat = (message: string, history: ChatMessage[]) =>
  api.post<{ answer: string; citations: Citation[] }>('/chat', { message, history }).then(r => r.data);
export const clearChat = () => api.delete('/chat').then(r => r.data);
