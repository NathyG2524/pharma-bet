import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS DI requires a runtime import for reflect-metadata injection
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import type { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

export type AuthUserView = { id: string; email: string };

export type AuthResponse = { accessToken: string; user: AuthUserView };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
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
