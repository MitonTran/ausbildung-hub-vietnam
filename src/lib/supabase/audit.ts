import "server-only";

/**
 * Legacy entry point — the canonical audit-logging utility now lives
 * at `@/lib/audit/createAuditLog`. This file re-exports the same
 * symbols so existing call sites keep working unchanged.
 *
 * New code should import from `@/lib/audit/createAuditLog`.
 */

export {
  createAuditLog,
  createAuditLog as writeAuditLog,
  createAiSuggestionAuditLog,
  actorTypeForRole,
  sanitizeAuditPayload,
  summarizeEvidenceFiles,
  AUDIT_ACTIONS,
} from "@/lib/audit/createAuditLog";

export type {
  CreateAuditLogInput,
  CreateAuditLogInput as WriteAuditLogInput,
  AiSuggestionAuditInput,
  AuditAction,
  AuditActorType,
  AuditTargetType,
} from "@/lib/audit/createAuditLog";
