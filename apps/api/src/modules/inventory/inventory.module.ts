import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { Medicine } from "../../entities/medicine.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [TypeOrmModule.forFeature([InventoryLot, Medicine]), TenancyModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
