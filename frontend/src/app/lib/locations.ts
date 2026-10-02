import { apiRequest } from "./api";

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export async function getLocations(
  organizationId: string,
): Promise<Location[]> {
  return apiRequest<Location[]>(
    `/api/v1/organizations/${organizationId}/locations`,
  );
}