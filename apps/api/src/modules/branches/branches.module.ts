import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";

@Module({
  imports: [TypeOrmModule.forFeature([Branch, UserMembership]), TenancyModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
