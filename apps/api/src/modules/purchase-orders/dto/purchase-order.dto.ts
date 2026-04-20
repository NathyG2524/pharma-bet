import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class PurchaseOrderLineInputDto {
  @ApiProperty({ description: "Medicine id" })
  @IsUUID()
  medicineId: string;

  @ApiProperty({ description: "Quantity ordered" })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Unit cost" })
  @IsOptional()
  @IsNumberString()
  unitCost?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: "Supplier id" })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ description: "Receive-at branch id" })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderLineInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineInputDto)
  lines: PurchaseOrderLineInputDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: "Supplier id" })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: "Receive-at branch id" })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [PurchaseOrderLineInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineInputDto)
  lines?: PurchaseOrderLineInputDto[];
}

export class PurchaseOrderDecisionDto {
  @ApiProperty({ description: "Reason" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
