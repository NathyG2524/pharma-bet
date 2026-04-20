import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SubmitSupplierReturnForApprovalDto {
  @IsOptional()
  @IsString()
  bmDelegateUserId?: string;

  @IsOptional()
  @IsBoolean()
  bmUnavailable?: boolean;
}
