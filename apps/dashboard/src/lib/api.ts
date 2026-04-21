import {
  adjustmentsApi,
  approvalsApi,
  auditEventsApi,
  authApi,
  branchesApi,
  inventoryApi,
  invitesApi,
  medicinesApi,
  notificationsApi,
  patientsApi,
  purchaseOrdersApi,
  salesApi,
  sessionApi,
  stockCountsApi,
  supplierReturnsApi,
  suppliersApi,
  taxesApi,
  tenantsApi,
  transfersApi,
} from "@drug-store/shared";
import { getAuthHeaders } from "./auth-storage";

const apiUrl =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ??
      (process.env.NODE_ENV === "development" ? "http://localhost:3051" : ""))
    : "";

if (apiUrl) {
  authApi.configure({ apiBaseUrl: apiUrl });
  invitesApi.configure({ apiBaseUrl: apiUrl });
  sessionApi.configure({ apiBaseUrl: apiUrl, getAuthHeaders });
  const options = { apiBaseUrl: apiUrl, getAuthHeaders };
  patientsApi.configure(options);
  medicinesApi.configure(options);
  branchesApi.configure(options);
  tenantsApi.configure(options);
  purchaseOrdersApi.configure(options);
  inventoryApi.configure(options);
  notificationsApi.configure(options);
  auditEventsApi.configure(options);
  taxesApi.configure(options);
  suppliersApi.configure(options);
  salesApi.configure(options);
  transfersApi.configure(options);
  adjustmentsApi.configure(options);
  stockCountsApi.configure(options);
  approvalsApi.configure(options);
  supplierReturnsApi.configure(options);
}

export {
  patientsApi,
  medicinesApi,
  branchesApi,
  tenantsApi,
  purchaseOrdersApi,
  inventoryApi,
  notificationsApi,
  auditEventsApi,
  taxesApi,
  suppliersApi,
  salesApi,
  transfersApi,
  adjustmentsApi,
  stockCountsApi,
  approvalsApi,
  supplierReturnsApi,
  authApi,
  invitesApi,
  sessionApi,
};
