import { apiRequest } from "./api";

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  items: AuditLog[];
  page: number;
  page_size: number;
  total: number;
}

export async function getAuditLogs(
  organizationId: string,
  page = 1,
  pageSize = 50,
): Promise<AuditLogResponse> {
  return apiRequest<AuditLogResponse>(
    `/api/v1/organizations/${organizationId}/audit-logs?page=${page}&page_size=${pageSize}`,
  );
}