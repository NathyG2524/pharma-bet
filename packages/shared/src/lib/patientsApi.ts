import type {
  CreatePatientHistoryInput,
  CreatePatientInput,
  PatientDto,
  PatientHistoryDto,
  PatientWithHistoryDto,
} from '../types/patient';

export class PatientsApi {
  private apiBaseUrl: string | null = null;

  configure(options: { apiBaseUrl?: string }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error('Patients API not configured (apiBaseUrl required)');
    }
    const url = `${this.apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} ${text}`);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return res.json();
  }

  async getPatientByPhone(phone: string): Promise<PatientWithHistoryDto> {
    const encoded = encodeURIComponent(phone);
    return this.request<PatientWithHistoryDto>(`/api/patients/by-phone/${encoded}`);
  }

  async getPatient(id: string): Promise<PatientDto> {
    return this.request<PatientDto>(`/api/patients/${id}`);
  }

  async createPatient(dto: CreatePatientInput): Promise<PatientDto> {
    return this.request<PatientDto>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getHistory(patientId: string): Promise<PatientHistoryDto[]> {
    return this.request<PatientHistoryDto[]>(`/api/patients/${patientId}/history`);
  }

  async addHistory(
    patientId: string,
    dto: CreatePatientHistoryInput,
  ): Promise<PatientHistoryDto> {
    return this.request<PatientHistoryDto>(`/api/patients/${patientId}/history`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}

export const patientsApi = new PatientsApi();
