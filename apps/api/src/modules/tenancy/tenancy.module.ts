import { Module, RequestMethod } from "@nestjs/common";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserMembership } from "../../entities/user-membership.entity";
import { AuthContextMiddleware } from "./auth-context.middleware";
import { AuthGuard } from "./auth.guard";
import { BranchGuard } from "./branch.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [TypeOrmModule.forFeature([UserMembership])],
  providers: [AuthGuard, RolesGuard, BranchGuard],
  exports: [AuthGuard, RolesGuard, BranchGuard],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthContextMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
