import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: 'Patient phone number (unique)' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Patient name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
