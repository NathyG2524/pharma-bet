import { createHash } from "node:crypto";
import { BadRequestException, GoneException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { IsNull, MoreThan, type Repository } from "typeorm";
import { Invite } from "../../entities/invite.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";
// biome-ignore lint/style/useImportType: NestJS DI requires a runtime import for reflect-metadata injection
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthResponse } from "../auth/auth.service";
// biome-ignore lint/style/useImportType: NestJS DI requires a runtime import for reflect-metadata injection
import { AuthService } from "../auth/auth.service";
import type { AcceptInviteDto } from "./dto/accept-invite.dto";

export type InviteLookup = {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  expiresAt: string;
};

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    private readonly authService: AuthService,
    private readonly auditEventsService: AuditEventsService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async lookupInvite(token: string): Promise<InviteLookup> {
    const tokenHash = this.hashToken(token);
    const invite = await this.inviteRepo.findOne({ where: { tokenHash } });
    if (!invite) {
      throw new NotFoundException("Invite not found");
    }
    if (invite.revokedAt) {
      throw new GoneException("Invite has been revoked");
    }
    if (invite.consumedAt) {
      throw new GoneException("Invite has already been used");
    }
    if (invite.expiresAt < new Date()) {
      throw new GoneException("Invite has expired");
    }
    return {
      id: invite.id,
      email: invite.email,
      tenantId: invite.tenantId,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResponse> {
    const tokenHash = this.hashToken(dto.token);
    const invite = await this.inviteRepo.findOne({
      where: {
        tokenHash,
        consumedAt: IsNull(),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!invite) {
      const anyInvite = await this.inviteRepo.findOne({ where: { tokenHash } });
      if (!anyInvite) {
        throw new NotFoundException("Invalid invite token");
      }
      if (anyInvite.consumedAt) {
        throw new BadRequestException("Invite has already been used");
      }
      if (anyInvite.revokedAt) {
        throw new BadRequestException("Invite has been revoked");
      }
      throw new BadRequestException("Invite has expired");
    }

    const normalizedEmail = invite.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          email: normalizedEmail,
          passwordHash,
        }),
      );
    } else {
      user.passwordHash = passwordHash;
      user = await this.userRepo.save(user);
    }

    const existingMembership = await this.membershipRepo.findOne({
      where: {
        tenantId: invite.tenantId,
        userId: user.id,
        role: invite.role,
      },
    });

    if (!existingMembership) {
      await this.membershipRepo.save(
        this.membershipRepo.create({
          tenantId: invite.tenantId,
          userId: user.id,
          role: invite.role,
          branchId: invite.branchId,
        }),
      );
    }

    invite.consumedAt = new Date();
    await this.inviteRepo.save(invite);

    await this.auditEventsService.recordEvent({
      tenantId: invite.tenantId,
      actorUserId: user.id,
      action: "invite.accepted",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
      },
    });

    const accessToken = await this.authService.signToken(user);
    return { accessToken, user: this.authService.toView(user) };
  }
}
