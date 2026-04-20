import { IsEnum, IsOptional, IsString } from "class-validator";
import { InventoryLotStatus } from "../../../entities/inventory-lot.entity";

export class UpdateLotStatusDto {
  @IsEnum(InventoryLotStatus)
  status: InventoryLotStatus;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
