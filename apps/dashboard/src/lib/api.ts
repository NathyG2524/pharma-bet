import { patientsApi, medicinesApi } from '@drug-store/shared';

const apiUrl =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ??
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3051'
        : ''))
    : '';

if (apiUrl) {
  patientsApi.configure({ apiBaseUrl: apiUrl });
  medicinesApi.configure({ apiBaseUrl: apiUrl });
}

export { patientsApi, medicinesApi };
