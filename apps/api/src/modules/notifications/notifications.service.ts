import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Notification } from "../../entities/notification.entity";
import type { AuthContext } from "../tenancy/auth-context";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  async listForBranch(context: AuthContext): Promise<Notification[]> {
    const scope = this.getBranchScope(context);
    return this.notificationRepo.find({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async createForBranch(params: {
    tenantId: string;
    branchId: string;
    type: string;
    title: string;
    message: string;
    entityId?: string | null;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create({
      tenantId: params.tenantId,
      branchId: params.branchId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityId: params.entityId ?? null,
      readAt: null,
    });
    return this.notificationRepo.save(notification);
  }
}
