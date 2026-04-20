import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import {
  STOCK_COUNT_REASON_CODES,
  type StockCountReasonCode,
} from "../../../entities/stock-count-variance.entity";

export class RecordVarianceDto {
  @IsUUID()
  lotId: string;

  @IsInt()
  @Min(0)
  countedQuantity: number;

  @IsIn(STOCK_COUNT_REASON_CODES)
  reasonCode: StockCountReasonCode;

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}
