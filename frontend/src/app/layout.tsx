// frontend/src/app/layout.tsx
import "./styles/globals.css";
import { ReactNode } from "react";
import Navbar from "../components/Navbar";
export const metadata = {
  title: "Situation X",
  description: "AI-powered decision and advisory engine",
};
type Props = {
  children: ReactNode;
};
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        
        {/* NAVBAR */}
        <Navbar />
        {/* MAIN CONTENT */}
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
