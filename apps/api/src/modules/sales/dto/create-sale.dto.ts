import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateSaleLineAllocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  lotId: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleLineDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  medicineId: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Price per unit at sale" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unitPrice?: string;

  @ApiPropertyOptional({ description: "Override reason for lot selection" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;

  @ApiPropertyOptional({ type: [CreateSaleLineAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineAllocationDto)
  allocations?: CreateSaleLineAllocationDto[];
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: "Patient id; omit for walk-in" })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({ description: "ISO date string" })
  @IsNotEmpty()
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreateSaleLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines: CreateSaleLineDto[];
}
