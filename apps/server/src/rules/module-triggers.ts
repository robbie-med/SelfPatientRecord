import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const triggersPath = path.resolve(__dirname, '../../../../packages/clinical-rules/src/module-triggers.json');

interface TriggerRule {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger: { any: Array<Record<string, unknown>> };
  message: string;
}

interface ModuleTriggers {
  modules: TriggerRule[];
}

function loadTriggers(): TriggerRule[] {
  try {
    const raw = readFileSync(triggersPath, 'utf-8');
    const data = JSON.parse(raw) as ModuleTriggers;
    return data.modules;
  } catch {
    return [];
  }
}

export interface PatientData {
  conditions: Array<{ name: string; status: string | null }>;
  medications: Array<{ name: string; generic_name?: string | null }>;
  labs: Array<{ test_name: string; numeric_value?: number | null; value: string }>;
}

export interface ModuleSuggestion {
  module_id: string;
  module_name: string;
  message: string;
  icon: string;
}

function nameContains(name: string, terms: string[]): boolean {
  const lower = name.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

function evaluateCondition(rule: Record<string, unknown>, data: PatientData): boolean {
  if (rule['diagnosis_contains']) {
    const terms = rule['diagnosis_contains'] as string[];
    return data.conditions.some((c) => nameContains(c.name, terms));
  }

  if (rule['medication_name_contains']) {
    const terms = rule['medication_name_contains'] as string[];
    return data.medications.some(
      (m) => nameContains(m.name, terms) || (m.generic_name ? nameContains(m.generic_name, terms) : false)
    );
  }

  if (rule['lab']) {
    const labName = rule['lab'] as string;
    const operator = rule['operator'] as string;
    const threshold = rule['value'] as number;
    const andRule = rule['and'] as Record<string, unknown> | undefined;

    const match = data.labs.find((l) => l.test_name.toLowerCase() === labName.toLowerCase());
    if (!match || match.numeric_value == null) return false;

    const val = match.numeric_value;
    let passes = false;
    if (operator === '>=') passes = val >= threshold;
    else if (operator === '>') passes = val > threshold;
    else if (operator === '<=') passes = val <= threshold;
    else if (operator === '<') passes = val < threshold;
    else if (operator === '==') passes = val === threshold;

    if (!passes) return false;
    if (andRule) return evaluateCondition(andRule, data);
    return true;
  }

  if (rule['condition_status']) {
    const status = rule['condition_status'] as string;
    return data.conditions.some((c) => c.status === status);
  }

  return false;
}

export function evaluateModuleTriggers(data: PatientData, activeModules: string[]): ModuleSuggestion[] {
  const triggers = loadTriggers();
  const suggestions: ModuleSuggestion[] = [];

  for (const trigger of triggers) {
    if (activeModules.includes(trigger.id)) continue;

    const triggered = trigger.trigger.any.some((condition) => evaluateCondition(condition, data));

    if (triggered) {
      suggestions.push({
        module_id: trigger.id,
        module_name: trigger.name,
        message: trigger.message,
        icon: trigger.icon,
      });
    }
  }

  return suggestions;
}
