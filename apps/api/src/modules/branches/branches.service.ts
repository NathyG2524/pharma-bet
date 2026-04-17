import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, type Repository } from "typeorm";
import { Branch } from "../../entities/branch.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import type { AssignMembershipDto } from "./dto/assign-membership.dto";
import type { CreateBranchDto } from "./dto/create-branch.dto";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
  ) {}

  async listForUser(context: AuthContext): Promise<Branch[]> {
    if (context.roles.some((role) => HQ_ROLES.includes(role))) {
      return this.branchRepo.find({
        where: { tenantId: context.tenantId },
        order: { name: "ASC" },
      });
    }
    if (!context.branchIds.length) {
      return [];
    }
    return this.branchRepo.find({
      where: { id: In(context.branchIds), tenantId: context.tenantId },
      order: { name: "ASC" },
    });
  }

  async createBranch(context: AuthContext, dto: CreateBranchDto): Promise<Branch> {
    const name = dto.name.trim();
    const exists = await this.branchRepo.exists({ where: { tenantId: context.tenantId, name } });
    if (exists) {
      throw new ConflictException("Branch name already exists");
    }
    const branch = this.branchRepo.create({
      tenantId: context.tenantId,
      name,
      code: dto.code?.trim() || null,
    });
    return this.branchRepo.save(branch);
  }

  async assignMembership(context: AuthContext, dto: AssignMembershipDto): Promise<UserMembership> {
    const userId = dto.userId.trim();
    const role = dto.role;
    const branchId = dto.branchId ?? null;

    const isBranchRole = BRANCH_ROLES.includes(role);
    if (isBranchRole && !branchId) {
      throw new BadRequestException("Branch role requires branchId");
    }
    if (!isBranchRole && branchId) {
      throw new BadRequestException("HQ roles should not target a branch");
    }

    if (branchId) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, tenantId: context.tenantId },
      });
      if (!branch) {
        throw new NotFoundException("Branch not found for tenant");
      }
    }

    const exists = await this.membershipRepo.exists({
      where: {
        tenantId: context.tenantId,
        userId,
        branchId: branchId ?? IsNull(),
        role,
      },
    });
    if (exists) {
      throw new ConflictException("Membership already exists");
    }

    const membership = this.membershipRepo.create({
      tenantId: context.tenantId,
      branchId,
      userId,
      role,
    });
    return this.membershipRepo.save(membership);
  }
}
