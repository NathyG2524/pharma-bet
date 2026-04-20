import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditEvent } from "../../entities/audit-event.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditEventsController } from "./audit-events.controller";
import { AuditEventsService } from "./audit-events.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent]), TenancyModule],
  controllers: [AuditEventsController],
  providers: [AuditEventsService],
  exports: [AuditEventsService],
})
export class AuditEventsModule {}
