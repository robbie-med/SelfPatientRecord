import { AIConfig, createAIClientFromConfig } from './client.js';

export interface PatientContext {
  age?: number;
  sex_at_birth?: string;
  conditions: Array<{ name: string; status: string }>;
  medications: Array<{ name: string; dose?: string; frequency?: string }>;
  labs: Array<{ test_name: string; value: string; unit?: string; collection_date: string; interpretation?: string }>;
  allergies: Array<{ allergen: string; severity?: string }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Citation {
  fact_type: string;
  label: string;
  source_quote?: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}

const SYSTEM_PROMPT = `You are a personal health record assistant helping a patient understand their own confirmed medical records.

Rules you must follow:
- Base answers only on the patient context provided. If something is not in the context, say so.
- Never diagnose conditions or prescribe treatments.
- Never say "you should take" or "you should stop taking" any medication.
- For emergencies, immediately say: "This sounds like a medical emergency. Stop and call 911 (or your local emergency number) immediately."
- Frame everything as "your records show..." or "based on your confirmed data..."
- Be clear, plain-language, and concise.
- Cite specific facts when answering (include a citations array in your response).
- If asked to generate a visit prep summary or questions for a doctor, do so helpfully.
- Acknowledge when your answer is limited by what's in the records.

Return JSON: {"answer": "...", "citations": [{"fact_type": "...", "label": "...", "source_quote": "..."}]}`;

export async function chatWithRecord(
  message: string,
  history: ChatMessage[],
  context: PatientContext,
  config: AIConfig
): Promise<ChatResponse> {
  const client = createAIClientFromConfig(config);

  const contextSummary = buildContextSummary(context);

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Patient record context:\n${contextSummary}\n\nAnswer the following question about this patient's record.`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const response = await client.chat.completions.create({
    model: config.chatModel,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content ?? '{"answer":"I could not process that request.","citations":[]}';
  const parsed = JSON.parse(raw);

  return {
    answer: parsed.answer ?? 'No response generated.',
    citations: parsed.citations ?? [],
  };
}

function buildContextSummary(ctx: PatientContext): string {
  const lines: string[] = [];

  if (ctx.age) lines.push(`Age: ${ctx.age}`);
  if (ctx.sex_at_birth) lines.push(`Sex at birth: ${ctx.sex_at_birth}`);

  if (ctx.conditions.length > 0) {
    lines.push('\nConditions:');
    ctx.conditions.forEach((c) => lines.push(`  - ${c.name} (${c.status})`));
  }

  if (ctx.medications.length > 0) {
    lines.push('\nMedications:');
    ctx.medications.forEach((m) => {
      const detail = [m.dose, m.frequency].filter(Boolean).join(', ');
      lines.push(`  - ${m.name}${detail ? ` (${detail})` : ''}`);
    });
  }

  if (ctx.allergies.length > 0) {
    lines.push('\nAllergies:');
    ctx.allergies.forEach((a) => lines.push(`  - ${a.allergen}${a.severity ? ` (${a.severity})` : ''}`));
  }

  if (ctx.labs.length > 0) {
    lines.push('\nRecent labs:');
    ctx.labs.forEach((l) =>
      lines.push(`  - ${l.test_name}: ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.collection_date})${l.interpretation ? ` [${l.interpretation}]` : ''}`)
    );
  }

  return lines.join('\n');
}
