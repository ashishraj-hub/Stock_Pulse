import { apiRequest } from "./api";

export interface UserResponse {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "viewer";
}

export async function getUsers(
  organizationId: string,
): Promise<UserResponse[]> {
  return apiRequest<UserResponse[]>(
    `/api/v1/organizations/${organizationId}/users`,
  );
}

export async function createUser(
  organizationId: string,
  data: CreateUserRequest,
): Promise<UserResponse> {
  return apiRequest<UserResponse>(
    `/api/v1/organizations/${organizationId}/users`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}