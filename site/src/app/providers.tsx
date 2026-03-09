import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useAuth } from "@/shared/hooks/useAuth";
import { pb } from "@/shared/lib/pb-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const theme = useThemeStore((s) => s.theme);
  const darkMode = useThemeStore((s) => s.darkMode);
  const logout = useAuth((s) => s.logout);

  // Apply theme to <html> element
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    if (darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme, darkMode]);

  // Keep persisted auth state consistent with PocketBase authStore.
  // Without this, stale tokens can keep UI in "logged in" state while APIs return 401.
  useEffect(() => {
    if (!pb.authStore.isValid) {
      logout();
    }

    const unsubscribe = pb.authStore.onChange(() => {
      if (!pb.authStore.isValid) {
        logout();
      }
    });

    return () => unsubscribe();
  }, [logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        richColors
      />
      {children}
    </QueryClientProvider>
  );
}
