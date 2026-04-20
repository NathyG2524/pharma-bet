import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
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

export class ReceivePurchaseOrderLineDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  purchaseOrderLineId: string;

  @ApiProperty({ description: "Lot or batch code" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  lotCode: string;

  @ApiProperty({ description: "Expiry date (YYYY-MM-DD)" })
  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ description: "Received quantity" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Unit cost for this receipt" })
  @IsNotEmpty()
  @IsNumberString()
  unitCost: string;

  @ApiPropertyOptional({ description: "Reason for allowing expired lot" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expiryOverrideReason?: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ description: "Idempotency key for receipt" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  receiptKey: string;

  @ApiProperty({ description: "Receipt timestamp (ISO)" })
  @IsNotEmpty()
  @IsDateString()
  receivedAt: string;

  @ApiProperty({ type: [ReceivePurchaseOrderLineDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderLineDto)
  lines: ReceivePurchaseOrderLineDto[];
}
