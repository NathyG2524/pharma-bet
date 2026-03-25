import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ description: 'Display name (unique)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'SKU or internal code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'Unit e.g. tablet, bottle' })
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

  @ApiPropertyOptional({ description: 'Hide from default list when false' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
