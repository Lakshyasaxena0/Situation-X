// backend/src/models/user.model.ts
import { supabase } from "../config/db";
import { User } from "../../../shared/types/user.types";
// -----------------------------
// CREATE USER
// -----------------------------
export async function createUser(
  email: string,
  passwordHash: string,
  name?: string
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email,
        password_hash: passwordHash,
        name: name ?? null,
      },
    ])
    .select("id, email, name, created_at")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message}`);
  }
  return data as User;
}
// -----------------------------
// GET USER BY EMAIL
// -----------------------------
export async function getUserByEmail(
  email: string
): Promise<(User & { password_hash: string }) | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch user by email: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as User & { password_hash: string };
}
// -----------------------------
// GET USER BY ID
// -----------------------------
export async function getUserById(
  id: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch user by id: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as User;
}
