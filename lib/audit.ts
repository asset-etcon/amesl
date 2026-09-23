import { db } from "@/lib/db";
import { auditLogs } from "@/db/schema";

/**
 * Records an audit entry. Never throws — audit logging must not break the
 * primary operation it is called from.
 */
export async function logAudit(
  auth: { id: string; email: string },
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      user_id: auth.id,
      user_email: auth.email,
      action,
      resource,
      resource_id: resourceId ?? "",
      details: details ?? {},
    });
  } catch {
    // ignore
  }
}