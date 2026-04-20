import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateSupplierProductDto {
  @ApiProperty({ description: "Medicine ID (canonical product)" })
  @IsNotEmpty()
  @IsUUID()
  medicineId: string;

  @ApiPropertyOptional({ description: "Supplier SKU or catalog code" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierSku?: string | null;

  @ApiPropertyOptional({ description: "Pack size quantity" })
  @IsOptional()
  @IsInt()
  @Min(1)
  packSize?: number | null;

  @ApiPropertyOptional({ description: "Pack size unit e.g. bottle, box" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  packUnit?: string | null;
}

export class UpdateSupplierProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierSku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  packSize?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  packUnit?: string | null;
}
