import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import {
  ADJUSTMENT_REASON_CODES,
  type AdjustmentReasonCode,
} from "../../../entities/inventory-adjustment.entity";

export class CreateAdjustmentDto {
  @IsUUID()
  lotId: string;

  @IsInt()
  quantity: number;

  @IsIn(ADJUSTMENT_REASON_CODES)
  reasonCode: AdjustmentReasonCode;

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}
