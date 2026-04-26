import { z } from 'zod';
import { AIConfig, createAIClientFromConfig } from './client.js';

const ExtractedConditionSchema = z.object({
  name: z.string(),
  status: z.string().default('active'),
  date: z.string().optional(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractedMedicationSchema = z.object({
  name: z.string(),
  generic_name: z.string().optional(),
  dose: z.string().optional(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  status: z.string().default('current'),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractedLabSchema = z.object({
  test_name: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  reference_range: z.string().optional(),
  interpretation: z.string().optional(),
  date: z.string().optional(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractedAllergySchema = z.object({
  allergen: z.string(),
  reaction: z.string().optional(),
  severity: z.string().optional(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractedVitalSchema = z.object({
  vital_type: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  date: z.string().optional(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractedImagingSchema = z.object({
  study_type: z.string(),
  body_part: z.string().optional(),
  findings: z.string(),
  date: z.string().optional(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

const ExtractionResultSchema = z.object({
  conditions: z.array(ExtractedConditionSchema).default([]),
  medications: z.array(ExtractedMedicationSchema).default([]),
  labs: z.array(ExtractedLabSchema).default([]),
  allergies: z.array(ExtractedAllergySchema).default([]),
  vitals: z.array(ExtractedVitalSchema).default([]),
  imaging: z.array(ExtractedImagingSchema).default([]),
  contradictions: z.array(z.object({
    description: z.string(),
    items: z.array(z.string()),
  })).default([]),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const SYSTEM_PROMPT = `You are a medical record parser. Extract structured health facts from the provided medical record text.

Return ONLY valid JSON matching this schema. Do not add commentary outside the JSON.

Rules:
- Extract only what is explicitly stated; do not infer or diagnose
- Include a source_quote (verbatim excerpt from the text) for every item
- Assign confidence 0.0-1.0 based on how clearly the fact is stated
- For conditions: status is one of: active, resolved, historical, possible, ruled_out
- For medications: status is one of: current, discontinued, prn, historical
- For labs: include value as a string (e.g. "10.7"), unit (e.g. "%"), and date if present
- For vitals: vital_type is one of: blood_pressure, heart_rate, temperature, weight, height, bmi, o2_sat, blood_glucose, other
- Flag contradictions (e.g. "no diabetes" in one place but diabetes medication listed)
- Do not diagnose, interpret clinically, or suggest treatment

JSON schema:
{
  "conditions": [{"name": string, "status": string, "date": string|null, "source_quote": string, "confidence": number}],
  "medications": [{"name": string, "generic_name": string|null, "dose": string|null, "route": string|null, "frequency": string|null, "status": string, "source_quote": string, "confidence": number}],
  "labs": [{"test_name": string, "value": string, "unit": string|null, "reference_range": string|null, "interpretation": string|null, "date": string|null, "source_quote": string, "confidence": number}],
  "allergies": [{"allergen": string, "reaction": string|null, "severity": string|null, "source_quote": string, "confidence": number}],
  "vitals": [{"vital_type": string, "value": string, "unit": string|null, "date": string|null, "source_quote": string, "confidence": number}],
  "imaging": [{"study_type": string, "body_part": string|null, "findings": string, "date": string|null, "source_quote": string, "confidence": number}],
  "contradictions": [{"description": string, "items": [string]}]
}`;

export async function extractFromText(text: string, config: AIConfig): Promise<ExtractionResult> {
  const client = createAIClientFromConfig(config);

  const response = await client.chat.completions.create({
    model: config.extractionModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract health facts from this medical record:\n\n${text}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return ExtractionResultSchema.parse(parsed);
}
