import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 border-b bg-white">
      <h1 className="text-xl font-bold">Situation X</h1>

      <div className="space-x-4">
        <Link href="/" className="text-gray-700 hover:text-black">
          Home
        </Link>
        <Link href="/history" className="text-gray-700 hover:text-black">
          History
        </Link>
        <Link href="/settings" className="text-gray-700 hover:text-black">
          Settings
        </Link>
      </div>
    </nav>
  );
}
