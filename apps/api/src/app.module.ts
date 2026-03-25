import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from './modules/patients/patients.module';
import { MedicinesModule } from './modules/medicines/medicines.module';
import { typeOrmConfig } from './typeorm-config';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    PatientsModule,
    MedicinesModule,
  ],
})
export class AppModule {}
