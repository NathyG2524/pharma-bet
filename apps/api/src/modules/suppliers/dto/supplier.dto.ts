import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ description: "Supplier display name" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: "Primary contact email" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string | null;

  @ApiPropertyOptional({ description: "Primary contact phone" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPhone?: string | null;

  @ApiPropertyOptional({ description: "Supplier address or location" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ description: "Notes for purchasing team" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
