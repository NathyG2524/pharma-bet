export type {
  PatientDto,
  PatientHistoryDto,
  PatientWithHistoryDto,
  CreatePatientInput,
  CreatePatientHistoryInput,
} from "./types/patient";
export type {
  MedicineDto,
  MedicineTransactionDto,
  MedicineListResponse,
  MedicineTransactionsResponse,
  CreateMedicineInput,
  UpdateMedicineInput,
  BuyMedicineInput,
  SellMedicineInput,
} from "./types/medicine";
export { PatientsApi, patientsApi } from "./lib/patientsApi";
export { MedicinesApi, medicinesApi } from "./lib/medicinesApi";
