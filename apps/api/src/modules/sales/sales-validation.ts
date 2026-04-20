type PatientRequiredMedicine = {
  requiresPatient: boolean;
};

export function requiresPatientForSale(medicines: PatientRequiredMedicine[]): boolean {
  return medicines.some((medicine) => medicine.requiresPatient);
}
