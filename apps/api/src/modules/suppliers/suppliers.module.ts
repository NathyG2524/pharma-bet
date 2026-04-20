import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Medicine } from "../../entities/medicine.entity";
import { SupplierProduct } from "../../entities/supplier-product.entity";
import { Supplier } from "../../entities/supplier.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { SuppliersController } from "./controllers/suppliers.controller";
import { SuppliersService } from "./services/suppliers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierProduct, Medicine]), TenancyModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
