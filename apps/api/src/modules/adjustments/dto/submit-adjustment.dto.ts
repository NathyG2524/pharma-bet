import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SubmitAdjustmentForApprovalDto {
  @IsOptional()
  @IsString()
  bmDelegateUserId?: string;

  @IsOptional()
  @IsBoolean()
  bmUnavailable?: boolean;
}
