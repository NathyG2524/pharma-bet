import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { ApprovalDecision, ApprovalLane } from "../../../entities/approval-instance.entity";

export class RecordApprovalDecisionDto {
  @IsIn(["bm", "hq"])
  lane: ApprovalLane;

  @IsIn(["approved", "rejected"])
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  @MinLength(2)
  reason?: string;
}
