import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

class BreakGlassDto {
  @IsString()
  @MinLength(5)
  reason: string;

  @IsDateString()
  expiresAt: string;
}

export class SubmitApprovalDto {
  @IsString()
  @MinLength(2)
  domainType: string;

  @IsString()
  @MinLength(1)
  domainId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  bmDelegateUserId?: string;

  @IsOptional()
  @IsBoolean()
  bmUnavailable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BreakGlassDto)
  breakGlass?: BreakGlassDto;
}
