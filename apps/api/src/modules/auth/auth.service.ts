<<<<<<< HEAD
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS DI requires a runtime import for reflect-metadata injection
=======
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: JwtService required for emitDecoratorMetadata / Nest DI
>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))
import { JwtService } from "@nestjs/jwt";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import type { DataSource, Repository } from "typeorm";
import { Invite } from "../../entities/invite.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";
import type { AcceptInviteDto } from "./dto/accept-invite.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { hashInviteToken } from "./invite-token.util";

export type AuthUserView = { id: string; email: string };

export type AuthResponse = { accessToken: string; user: AuthUserView };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async signToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
  }

  toView(user: User): AuthUserView {
    return { id: user.id, email: user.email };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const exists = await this.usersRepo.exists({ where: { email } });
    if (exists) {
      throw new ConflictException("An account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email,
        passwordHash,
      }),
    );
    const accessToken = await this.signToken(user);
    return { accessToken, user: this.toView(user) };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResponse> {
    const tokenHash = hashInviteToken(dto.token);
    const userAndToken = await this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .getRepository(Invite)
        .createQueryBuilder("invite")
        .setLock("pessimistic_write")
        .where("invite.tokenHash = :tokenHash", { tokenHash })
        .getOne();

      const now = new Date();
      if (
        !invite ||
        invite.revokedAt !== null ||
        invite.consumedAt !== null ||
        invite.expiresAt.getTime() <= now.getTime()
      ) {
        throw new BadRequestException("Invalid or expired invite");
      }

      const email = this.normalizeEmail(invite.email);
      const exists = await manager.getRepository(User).exists({ where: { email } });
      if (exists) {
        throw new ConflictException("An account with this email already exists");
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await manager.getRepository(User).save(
        manager.getRepository(User).create({
          email,
          passwordHash,
        }),
      );

      await manager.getRepository(UserMembership).save(
        manager.getRepository(UserMembership).create({
          tenantId: invite.tenantId,
          branchId: invite.branchId,
          userId: user.id,
          role: invite.role,
        }),
      );

      invite.consumedAt = now;
      await manager.getRepository(Invite).save(invite);

      return user;
    });

    const accessToken = await this.signToken(userAndToken);
    return { accessToken, user: this.toView(userAndToken) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const accessToken = await this.signToken(user);
    return { accessToken, user: this.toView(user) };
  }
}
