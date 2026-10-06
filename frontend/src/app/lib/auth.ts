import { apiRequest } from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "viewer";
}

export async function login(
  data: LoginRequest,
): Promise<TokenResponse> {
  return apiRequest<TokenResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function saveAccessToken(token: string) {
  localStorage.setItem("stockpulse_access_token", token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem("stockpulse_access_token");
}

export function clearAccessToken() {
  localStorage.removeItem("stockpulse_access_token");
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>(
    "/api/v1/auth/me",
  );
}