import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { getJwtSecret } from "./jwt-secret";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

@Module({
  imports: [
    TenancyModule,
    TypeOrmModule.forFeature([User, UserMembership, Tenant]),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController, SessionController],
  providers: [AuthService, SessionService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
