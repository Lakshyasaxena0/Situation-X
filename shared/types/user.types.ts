// shared/types/user.types.ts
// -----------------------------
// USER CORE TYPE
// -----------------------------
export type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};
// -----------------------------
// JWT PAYLOAD (DECODED TOKEN)
// -----------------------------
export type AuthPayload = {
  id: string;
  email: string;
  iat: number; // issued at
  exp: number; // expiry
};
// -----------------------------
// AUTH REQUEST TYPES
// -----------------------------
export type LoginRequest = {
  email: string;
  password: string;
};
export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
};
// -----------------------------
// AUTH RESPONSE
// -----------------------------
export type AuthResponse = {
  token: string;
  user: User;
};
