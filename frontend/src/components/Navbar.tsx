"use client";
import Link from "next/link";
import Image from "next/image";
import { useAppStore } from "../state/store";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 border-b bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      {/* LOGO + NAME */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Situation X Logo"
          width={40}
          height={40}
          className="rounded-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-xl font-bold text-gray-900">Situation X</span>
      </Link>

      {/* NAV LINKS */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link href="/" className="text-gray-600 hover:text-orange-500 font-medium transition">
              Home
            </Link>
            <Link href="/history" className="text-gray-600 hover:text-orange-500 font-medium transition">
              History
            </Link>
            <Link href="/feedback" className="text-gray-600 hover:text-orange-500 font-medium transition">
              Feedback
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-orange-500 font-medium transition">
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-600 hover:text-orange-500 font-medium transition">
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
