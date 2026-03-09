import type { RecordModel } from "pocketbase";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { pb } from "@/shared/lib/pb-client";

export type AuthUser = RecordModel & {
  email?: string;
  name?: string;
};

type PersistedAuthState = Pick<AuthState, "user" | "token" | "isAuthenticated">;

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user: AuthUser, token: string) => {
        pb.authStore.save(token, user);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        pb.authStore.clear();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

if (typeof window !== "undefined") {
  const stored = localStorage.getItem("auth-storage");
  if (stored) {
    try {
      const { state } = JSON.parse(stored) as { state?: PersistedAuthState };
      if (state?.token && state?.user) {
        pb.authStore.save(state.token, state.user);
      }
    } catch (e) {
      console.error("Failed to restore auth state:", e);
    }
  }
}
