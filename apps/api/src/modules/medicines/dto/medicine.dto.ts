import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateMedicineDto {
  @ApiProperty({ description: "Display name (unique)" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: "SKU or internal code" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: "Unit e.g. tablet, bottle" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;
}

export class UpdateMedicineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string | null;

  @ApiPropertyOptional({ description: "Hide from default list when false" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMedicineOverlayDto {
  @ApiPropertyOptional({ description: "Reorder minimum threshold" })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderMin?: number | null;

  @ApiPropertyOptional({ description: "Reorder maximum threshold" })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderMax?: number | null;

  @ApiPropertyOptional({ description: "Bin or shelf location" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  binLocation?: string | null;

  @ApiPropertyOptional({ description: "Local sell price" })
  @IsOptional()
  @IsNumberString()
  localPrice?: string | null;

  @ApiPropertyOptional({ description: "Local cost" })
  @IsOptional()
  @IsNumberString()
  localCost?: string | null;
}
