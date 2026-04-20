import { IsBoolean, IsOptional } from "class-validator";

export class UpdateApprovalPolicyDto {
  @IsOptional()
  @IsBoolean()
  allowHqBreakGlass?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCombinedHqForSingleBranch?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCombinedHqWhenBmUnavailable?: boolean;
}
