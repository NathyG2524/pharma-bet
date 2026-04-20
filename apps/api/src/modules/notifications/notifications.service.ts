import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { Branch } from "../../entities/branch.entity";
import { Notification } from "../../entities/notification.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreatePoPendingBranchApprovalDto } from "./dto/create-po-pending-branch-approval.dto";
import { NotificationEmailService } from "./notification-email.service";

const BRANCH_APPROVER_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];
const PO_PENDING_EVENT = "po_pending_branch_approval";

type NotificationInsertPayload = {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @Inject(NotificationEmailService)
    private readonly emailService: NotificationEmailService,
  ) {}

  private getUserScope(context: AuthContext) {
    if (!context.tenantId || !context.userId) {
      throw new UnauthorizedException("Notification context requires tenant and user");
    }
    return { tenantId: context.tenantId, userId: context.userId };
  }

  async listForUser(context: AuthContext): Promise<Notification[]> {
    const scope = this.getUserScope(context);
    return this.notificationRepo.find({
      where: { tenantId: scope.tenantId, userId: scope.userId },
      order: { createdAt: "DESC" },
    });
  }

  async markRead(context: AuthContext, notificationId: string): Promise<Notification> {
    const scope = this.getUserScope(context);
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, tenantId: scope.tenantId, userId: scope.userId },
    });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return this.notificationRepo.save(notification);
    }
    return notification;
  }

  async notifyPoPendingBranchApproval(
    context: AuthContext,
    dto: CreatePoPendingBranchApprovalDto,
  ): Promise<{ created: number; emailed: number }> {
    const scope = this.getUserScope(context);
    if (!dto.branchId) {
      throw new BadRequestException("Branch id is required for PO approval notification");
    }
    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: scope.tenantId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found for tenant");
    }

    const memberships = await this.membershipRepo.find({
      where: {
        tenantId: scope.tenantId,
        branchId: dto.branchId,
        role: In(BRANCH_APPROVER_ROLES),
      },
    });
    const userIds = memberships.map((membership) => membership.userId);
    if (!userIds.length) {
      return { created: 0, emailed: 0 };
    }

    const poLabel = dto.poNumber?.trim() || dto.poId;
    const eventKey = `${PO_PENDING_EVENT}:${dto.poId}`;
    const notifications = userIds.map((userId) => ({
      tenantId: scope.tenantId,
      branchId: dto.branchId,
      userId,
      title: "PO pending approval",
      body: `Purchase order ${poLabel} is pending branch approval.`,
      link: `/purchase-orders/${dto.poId}`,
      eventType: PO_PENDING_EVENT,
      eventKey,
    }));

    const insertResult = await this.notificationRepo
      .createQueryBuilder()
      .insert()
      .values(notifications)
      .orIgnore()
      .returning(["id", "userId", "title", "body", "link"])
      .execute();

    const createdNotifications = insertResult.raw as NotificationInsertPayload[];
    let emailed = 0;
    for (const notification of createdNotifications) {
      const recipient = this.emailService.resolveRecipient(notification.userId);
      if (!recipient) {
        continue;
      }
      await this.emailService.sendNotificationEmail({
        to: recipient,
        subject: notification.title,
        body: notification.body,
      });
      emailed += 1;
    }

    return { created: createdNotifications.length, emailed };
  }
}
