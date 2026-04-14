// frontend/src/utils/validators.ts
// -----------------------------
// VALIDATE INPUT TEXT
// -----------------------------
export function validateInput(
  text: string
): { valid: boolean; error?: string } {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "Input is required" };
  }
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: "Input must be at least 10 characters long",
    };
  }
  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: "Input must not exceed 1000 characters",
    };
  }
  return { valid: true };
}
// -----------------------------
// VALIDATE EMAIL
// -----------------------------
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim().toLowerCase());
}
// -----------------------------
// VALIDATE PASSWORD
// -----------------------------
export function validatePassword(
  password: string
): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }
  return { valid: true };
}
