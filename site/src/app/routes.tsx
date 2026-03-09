import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { useAuth } from "@/shared/hooks/useAuth";

const EditorView = lazy(() => import("@/views/editor").then((m) => ({ default: m.EditorView })));
const LoginView = lazy(() => import("@/views/auth").then((m) => ({ default: m.LoginView })));
const DocsView = lazy(() => import("@/views/docs").then((m) => ({ default: m.DocsView })));

function LoadingFallback() {
  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

export const routes: RouteObject[] = [
  {
    path: "/docs",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <DocsView />
      </Suspense>
    ),
  },
  {
    path: "/docs/*",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <DocsView />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <EditorView />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginView />
      </PublicRoute>
    ),
  },
];

export const router = createBrowserRouter(routes);
