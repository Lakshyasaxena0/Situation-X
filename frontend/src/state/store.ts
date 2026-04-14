// frontend/src/state/store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  EngineResponse,
  AnalysisRecord,
} from "../../../shared/types/result.types";

import { User } from "../../../shared/types/user.types";

// -----------------------------
// STATE TYPE
// -----------------------------

type AppState = {
  user: User | null;
  token: string | null;
  currentAnalysis: EngineResponse | null;
  history: AnalysisRecord[];

  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAnalysis: (analysis: EngineResponse | null) => void;
  setHistory: (history: AnalysisRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
};

// -----------------------------
// STORE
// -----------------------------

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currentAnalysis: null,
      history: [],

      isLoading: false,
      error: null,

      // -----------------------------
      // ACTIONS
      // -----------------------------

      setUser: (user) => set({ user }),

      setToken: (token) => set({ token }),

      setAnalysis: (analysis) => set({ currentAnalysis: analysis }),

      setHistory: (history) => set({ history }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      logout: () =>
        set({
          user: null,
          token: null,
          currentAnalysis: null,
          history: [],
          error: null,
        }),
    }),
    {
      name: "situation-x-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
