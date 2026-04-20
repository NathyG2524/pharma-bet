import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsUUID, MaxLength } from "class-validator";

export class UpdateBranchTaxSettingsDto {
  @ApiPropertyOptional({ description: "Default tax category id (null clears)" })
  @IsOptional()
  @IsUUID()
  defaultTaxCategoryId?: string | null;

  @ApiPropertyOptional({ description: "Override tax rate for branch (null clears)" })
  @IsOptional()
  @IsNumberString()
  @MaxLength(16)
  taxRateOverride?: string | null;
}
