import { db } from "../lib/database.ts";
import { auditLogs } from "../../database/schema.ts";
import type { auditActionEnum } from "../../database/schema.ts";

type AuditAction = typeof auditActionEnum.enumValues[number];

export async function logAudit(input: {
  action: AuditAction;
  actorId?: string;
  targetId?: string;
  targetType?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLogs).values({
    action: input.action,
    actor_id: input.actorId,
    target_id: input.targetId,
    target_type: input.targetType,
    before: input.before ?? {},
    after: input.after ?? {},
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress,
  });
}
