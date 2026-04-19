export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  link: string | null;
  eventType: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CreatePoPendingBranchApprovalNotificationInput {
  poId: string;
  branchId: string;
  poNumber?: string;
}

export interface NotificationDispatchResult {
  created: number;
  emailed: number;
}
