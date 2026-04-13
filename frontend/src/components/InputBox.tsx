// frontend/src/components/InputBox.tsx
"use client";
import { useState } from "react";
import { validateInput } from "../utils/validators";
type Props = {
  onSubmit: (input: string) => void;
  isLoading: boolean;
};
export default function InputBox({ onSubmit, isLoading }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const maxLength = 1000;
  // -----------------------------
  // HANDLE SUBMIT
  // -----------------------------
  const handleSubmit = () => {
    const validation = validateInput(input);
    if (!validation.valid) {
      setError(validation.error || "Invalid input");
      return;
    }
    setError(null);
    onSubmit(input.trim());
  };
  // -----------------------------
  // HANDLE CHANGE
  // -----------------------------
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInput(value);
      if (error) setError(null);
    }
  };
  const isDisabled = isLoading || input.trim().length < 10;
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-md rounded-2xl p-4 border border-gray-200">
        {/* TEXTAREA */}
        <textarea
          value={input}
          onChange={handleChange}
          placeholder="Describe your situation in detail..."
          className="w-full h-40 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
        />
        {/* CHARACTER COUNT */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>{input.length}/{maxLength}</span>
          {error && (
            <span className="text-red-500">{error}</span>
          )}
        </div>
        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={`mt-4 w-full py-2 rounded-xl font-medium transition ${
            isDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Analyzing...
            </span>
          ) : (
            "Analyze Situation"
          )}
        </button>
      </div>
    </div>
  );
}
