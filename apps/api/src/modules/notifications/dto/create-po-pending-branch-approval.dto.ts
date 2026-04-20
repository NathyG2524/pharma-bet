import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreatePoPendingBranchApprovalDto {
  @IsString()
  @MinLength(3)
  poId: string;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsString()
  poNumber?: string;
}
