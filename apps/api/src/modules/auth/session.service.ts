import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";

export type SessionMembershipDto = {
  role: string;
  branchId: string | null;
};

export type SessionTenantDto = {
  id: string;
  name: string;
  memberships: SessionMembershipDto[];
};

export type SessionBootstrapDto = {
  isPlatformAdmin: boolean;
  tenants: SessionTenantDto[];
};

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async getBootstrap(userId: string | undefined): Promise<SessionBootstrapDto> {
    if (!userId) {
      throw new UnauthorizedException("Missing user identity");
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.platformAdmin === true) {
      const tenants = await this.tenantRepo.find({ order: { name: "ASC" } });
      return {
        isPlatformAdmin: true,
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          memberships: [],
        })),
      };
    }

    const memberships = await this.membershipRepo.find({
      where: { userId },
      relations: { tenant: true },
      order: { tenantId: "ASC", createdAt: "ASC" },
    });

    const byTenant = new Map<
      string,
      { id: string; name: string; memberships: SessionMembershipDto[] }
    >();
    for (const m of memberships) {
      const tid = m.tenantId;
      if (!byTenant.has(tid)) {
        byTenant.set(tid, {
          id: tid,
          name: m.tenant.name,
          memberships: [],
        });
      }
      const row = byTenant.get(tid);
      if (row) {
        row.memberships.push({
          role: m.role,
          branchId: m.branchId,
        });
      }
    }

    return {
      isPlatformAdmin: false,
      tenants: [...byTenant.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
}
