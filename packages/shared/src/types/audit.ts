export type AuditEventMetadata = Record<string, unknown>;

export interface AuditEventDto {
  id: string;
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: AuditEventMetadata;
  createdAt: string;
}

export interface AuditEventListResponse {
  items: AuditEventDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListAuditEventsInput {
  tenantId?: string;
  actorUserId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
