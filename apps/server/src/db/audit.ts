import { v4 as uuid } from 'uuid';
import { db } from './index.js';
import * as schema from './schema.js';

export type AuditAction = 'created' | 'updated' | 'deleted' | 'confirmed' | 'dismissed' | 'enabled' | 'disabled';

export interface AuditArgs {
  patientId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details?: Record<string, unknown>;
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  aiInvolved?: boolean;
}

export async function audit(args: AuditArgs): Promise<void> {
  await db.insert(schema.audit_log).values({
    id: uuid(),
    patient_id: args.patientId,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId,
    details: args.details ? JSON.stringify(args.details) : null,
    diff_json: args.diff ? JSON.stringify(args.diff) : null,
    ai_involved: args.aiInvolved ?? false,
    created_at: new Date().toISOString(),
  });
}
