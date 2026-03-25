import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePatientHistoryDto {
  @ApiProperty({ description: 'When the reading was recorded (ISO date string)' })
  @IsNotEmpty()
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional({ description: 'Systolic blood pressure' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePatientHistoryDto extends PartialType(
  CreatePatientHistoryDto,
) {}
