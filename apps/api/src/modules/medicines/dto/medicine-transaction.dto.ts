import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
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

  @ApiProperty({ description: "Unit cost at receipt" })
  @IsNotEmpty()
  @IsNumberString()
  unitPrice: string;

  @ApiProperty({ description: "Lot or batch code" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  lotCode: string;

  @ApiProperty({ description: "Expiry date (YYYY-MM-DD)" })
  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ description: "Reason for receiving expired lot" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expiryOverrideReason?: string;

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
