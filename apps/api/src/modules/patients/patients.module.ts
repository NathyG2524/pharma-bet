import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../../entities/patient.entity';
import { PatientHistory } from '../../entities/patient-history.entity';
import { PatientsController } from './controllers/patients.controller';
import { PatientsService } from './services/patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, PatientHistory]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
