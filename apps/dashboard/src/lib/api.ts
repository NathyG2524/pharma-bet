import {
  branchesApi,
  medicinesApi,
  notificationsApi,
  patientsApi,
  purchaseOrdersApi,
  suppliersApi,
  tenantsApi,
} from "@drug-store/shared";
import { getAuthHeaders } from "./auth-storage";

const apiUrl =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ??
      (process.env.NODE_ENV === "development" ? "http://localhost:3051" : ""))
    : "";

if (apiUrl) {
  const options = { apiBaseUrl: apiUrl, getAuthHeaders };
  patientsApi.configure(options);
  medicinesApi.configure(options);
  branchesApi.configure(options);
  tenantsApi.configure(options);
  suppliersApi.configure(options);
  purchaseOrdersApi.configure(options);
  notificationsApi.configure(options);
}

export {
  patientsApi,
  medicinesApi,
  branchesApi,
  tenantsApi,
  suppliersApi,
  purchaseOrdersApi,
  notificationsApi,
};
