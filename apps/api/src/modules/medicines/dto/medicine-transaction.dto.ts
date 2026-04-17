import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class BuyMedicineDto {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Price per unit at purchase" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unitPrice?: string;

  @ApiProperty({ description: "ISO date string" })
  @IsNotEmpty()
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SellMedicineDto {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Patient id; omit for walk-in" })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: "Price per unit at sale" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unitPrice?: string;

  @ApiProperty({ description: "ISO date string" })
  @IsNotEmpty()
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
