// frontend/src/app/profile/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "../../state/store";
import { apiClient } from "../../services/api";
import { formatDate } from "../../utils/formatters";
export default function ProfilePage() {
  const router = useRouter();
  const { user, token, setUser, setError } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  // -----------------------------
  // AUTH GUARD
  // -----------------------------
  useEffect(() => {
    if (!token || !user) {
      router.push("/login");
    }
  }, [token, user, router]);
  // -----------------------------
  // UPDATE PROFILE
  // -----------------------------
  const handleUpdate = async () => {
    if (!token) return;
    try {
      setIsSaving(true);
      const updated = await apiClient.put<{
        name: string;
      }>("/profile", { name }, token);
      setUser({
        ...user!,
        name: updated.name,
      });
    } catch (error: any) {
      setError(error.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };
  if (!user) return null;
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        {/* EMAIL */}
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">{user.email}</p>
        </div>
        {/* NAME EDIT */}
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <input
            value={name || ""}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>
        {/* CREATED */}
        <div>
          <label className="text-sm text-gray-500">
            Account Created
          </label>
          <p>{formatDate(user.created_at)}</p>
        </div>
        {/* SAVE BUTTON */}
        <button
          onClick={handleUpdate}
          disabled={isSaving}
          className={`w-full py-2 rounded-lg ${
            isSaving
              ? "bg-gray-300"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </main>
  );
}
