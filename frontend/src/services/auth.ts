// frontend/src/services/auth.ts
import { apiClient } from "./api";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../../../shared/types/user.types";
// -----------------------------
// LOGIN
// -----------------------------
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const payload: LoginRequest = { email, password };
  return apiClient.post<AuthResponse>("/auth/login", payload);
}
// -----------------------------
// REGISTER
// -----------------------------
export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const payload: RegisterRequest = {
    email,
    password,
    name,
  };
  return apiClient.post<AuthResponse>("/auth/register", payload);
}
