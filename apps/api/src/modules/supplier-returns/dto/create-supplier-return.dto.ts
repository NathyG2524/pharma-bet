import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateSupplierReturnLineDto {
  @IsUUID()
  lotId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}

export class CreateSupplierReturnDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  sourcePurchaseOrderId?: string;

  @IsOptional()
  @IsUUID()
  sourceReceiptId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierReturnLineDto)
  lines: CreateSupplierReturnLineDto[];
}
