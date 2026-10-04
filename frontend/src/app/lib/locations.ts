import { apiRequest } from "./api";

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface CreateLocationRequest {
  name: string;
}

export async function getLocations(
  organizationId: string,
): Promise<Location[]> {
  return apiRequest<Location[]>(
    `/api/v1/organizations/${organizationId}/locations`,
  );
}

export async function getLocation(
  organizationId: string,
  locationId: string,
): Promise<Location> {
  return apiRequest<Location>(
    `/api/v1/organizations/${organizationId}/locations/${locationId}`,
  );
}

export async function createLocation(
  organizationId: string,
  data: CreateLocationRequest,
): Promise<Location> {
  return apiRequest<Location>(
    `/api/v1/organizations/${organizationId}/locations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}