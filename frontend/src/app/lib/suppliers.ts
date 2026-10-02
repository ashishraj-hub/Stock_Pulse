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

export async function getSuppliers(
  organizationId: string,
): Promise<Supplier[]> {
  return apiRequest<Supplier[]>(
    `/api/v1/organizations/${organizationId}/suppliers`,
  );
}