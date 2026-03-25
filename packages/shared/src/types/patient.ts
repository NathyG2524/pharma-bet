export interface PatientDto {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientHistoryDto {
  id: string;
  patientId: string;
  recordedAt: string;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  notes: string | null;
  createdAt: string;
}

export interface PatientWithHistoryDto extends PatientDto {
  history: PatientHistoryDto[];
}

export interface CreatePatientInput {
  phone: string;
  name?: string;
}

export interface CreatePatientHistoryInput {
  recordedAt: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  notes?: string;
}
