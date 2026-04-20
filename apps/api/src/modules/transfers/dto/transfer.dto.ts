import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateTransferLineDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  medicineId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTransferDto {
  @ApiProperty({ description: "Destination branch id" })
  @IsNotEmpty()
  @IsUUID()
  destinationBranchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ type: [CreateTransferLineDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferLineDto)
  lines: CreateTransferLineDto[];
}

export class ShipTransferLineAllocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  lotId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ShipTransferLineDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  transferLineId: string;

  @ApiPropertyOptional({ type: [ShipTransferLineAllocationDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShipTransferLineAllocationDto)
  allocations?: ShipTransferLineAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}

export class ShipTransferDto {
  @ApiPropertyOptional({ type: [ShipTransferLineDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShipTransferLineDto)
  lines?: ShipTransferLineDto[];
}

export class ReceiveTransferAllocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  allocationId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityReceived: number;
}

export class ReceiveTransferDto {
  @ApiProperty({ type: [ReceiveTransferAllocationDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferAllocationDto)
  allocations: ReceiveTransferAllocationDto[];
}
