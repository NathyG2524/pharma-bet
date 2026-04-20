import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateStockCountSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}
