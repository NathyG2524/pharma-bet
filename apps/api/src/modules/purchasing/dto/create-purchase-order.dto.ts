import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
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

export class CreatePurchaseOrderLineDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  medicineId: string;

  @ApiProperty({ description: "Ordered quantity" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Expected unit cost" })
  @IsOptional()
  @IsNumberString()
  unitCost?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: "Receiving branch id" })
  @IsNotEmpty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: "External PO number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderNumber?: string;

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines: CreatePurchaseOrderLineDto[];
}
