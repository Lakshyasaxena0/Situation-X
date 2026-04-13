// frontend/src/app/login/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../services/auth";
import { useAppStore } from "../../state/store";
import { validateEmail, validatePassword } from "../../utils/validators";
export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken, setError, token } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // -----------------------------
  // REDIRECT IF ALREADY LOGGED IN
  // -----------------------------
  useEffect(() => {
    if (token) {
      router.push("/");
    }
  }, [token, router]);
  // -----------------------------
  // HANDLE LOGIN
  // -----------------------------
  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setLocalError("Invalid email format");
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setLocalError(passwordCheck.error || "Invalid password");
      return;
    }
    try {
      setIsLoading(true);
      setLocalError(null);
      const res = await login(email, password);
      setUser(res.user);
      setToken(res.token);
      router.push("/");
    } catch (error: any) {
      setLocalError(error.message || "Login failed");
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-semibold text-center">
          Login
        </h1>
        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLocalError(null);
          }}
          className="w-full p-2 border rounded-lg"
        />
        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLocalError(null);
          }}
          className="w-full p-2 border rounded-lg"
        />
        {/* ERROR */}
        {localError && (
          <p className="text-red-500 text-sm">{localError}</p>
        )}
        {/* BUTTON */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full py-2 rounded-lg ${
            isLoading
              ? "bg-gray-300"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
        {/* REGISTER LINK */}
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <span
            onClick={() => router.push("/register")}
            className="text-orange-500 cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
      </div>
    </main>
  );
}
