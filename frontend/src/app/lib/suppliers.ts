import { apiRequest } from "./api";

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export async function getSuppliers(
  organizationId: string,
): Promise<Supplier[]> {
  return apiRequest<Supplier[]>(
    `/api/v1/organizations/${organizationId}/suppliers`,
  );
}

export async function getSupplier(
  organizationId: string,
  supplierId: string,
): Promise<Supplier> {
  return apiRequest<Supplier>(
    `/api/v1/organizations/${organizationId}/suppliers/${supplierId}`,
  );
}

export async function createSupplier(
  organizationId: string,
  data: CreateSupplierRequest,
): Promise<Supplier> {
  return apiRequest<Supplier>(
    `/api/v1/organizations/${organizationId}/suppliers`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}