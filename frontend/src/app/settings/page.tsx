// frontend/src/app/settings/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "../../state/store";
import { apiClient } from "../../services/api";

import { validatePassword } from "../../utils/validators";

export default function SettingsPage() {
  const router = useRouter();

  const { user, token, setUser, logout, setError } = useAppStore();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
  const handleProfileUpdate = async () => {
    if (!token) return;

    try {
      setIsSaving(true);

      const res = await apiClient.put<{ name: string }>(
        "/profile",
        { name },
        token
      );

      setUser({
        ...user!,
        name: res.name,
      });

      alert("Profile updated");
    } catch (error: any) {
      setError(error.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------
  // CHANGE PASSWORD
  // -----------------------------
  const handlePasswordChange = async () => {
    if (!token) return;

    if (!currentPassword) {
      setLocalError("Current password required");
      return;
    }

    const check = validatePassword(newPassword);
    if (!check.valid) {
      setLocalError(check.error || "Invalid password");
      return;
    }

    try {
      setIsSaving(true);
      setLocalError(null);

      await apiClient.post(
        "/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
        token
      );

      setCurrentPassword("");
      setNewPassword("");

      alert("Password changed successfully");
    } catch (error: any) {
      setLocalError(error.message || "Password change failed");
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) return null;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* PROFILE */}
        <div className="bg-white p-6 rounded-xl shadow space-y-3">
          <h2 className="text-lg font-semibold">Profile</h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />

          <button
            onClick={handleProfileUpdate}
            disabled={isSaving}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg"
          >
            Save Profile
          </button>
        </div>

        {/* PASSWORD */}
        <div className="bg-white p-6 rounded-xl shadow space-y-3">
          <h2 className="text-lg font-semibold">Change Password</h2>

          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setLocalError(null);
            }}
            className="w-full p-2 border rounded-lg"
          />

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setLocalError(null);
            }}
            className="w-full p-2 border rounded-lg"
          />

          {localError && (
            <p className="text-red-500 text-sm">{localError}</p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={isSaving}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg"
          >
            Change Password
          </button>
        </div>

        {/* LOGOUT */}
        <div className="bg-white p-6 rounded-xl shadow">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
