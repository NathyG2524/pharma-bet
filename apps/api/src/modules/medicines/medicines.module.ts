import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MedicineTransaction } from "../../entities/medicine-transaction.entity";
import { Medicine } from "../../entities/medicine.entity";
import { Patient } from "../../entities/patient.entity";
import { MedicinesController } from "./controllers/medicines.controller";
import { MedicinesService } from "./services/medicines.service";

@Module({
  imports: [TypeOrmModule.forFeature([Medicine, MedicineTransaction, Patient])],
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService],
})
export class MedicinesModule {}
