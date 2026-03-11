import { useQuery } from "@tanstack/react-query";
import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { useAuth } from "@/shared/hooks/useAuth";
import { getDefaultSpace } from "@/shared/lib/api-client";

const DashboardView = lazy(() =>
  import("@/views/dashboard").then((m) => ({ default: m.DashboardView })),
);
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
        to="/dashboard"
        replace
      />
    );
  }

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function SmartRedirect() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const { data: defaultSpace, isLoading } = useQuery({
    queryKey: ["defaultSpace"],
    queryFn: getDefaultSpace,
    enabled: !isAuthenticated,
    staleTime: 60_000,
  });

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  if (isLoading) {
    return null;
  }

  if (defaultSpace?.slug) {
    return (
      <Navigate
        to={`/${defaultSpace.slug}`}
        replace
      />
    );
  }

  return (
    <Navigate
      to="/login"
      replace
    />
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <SmartRedirect />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginView />
      </PublicRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardView />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard/:spaceId",
    element: (
      <ProtectedRoute>
        <DashboardView />
      </ProtectedRoute>
    ),
  },
  {
    path: "/:slug",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <DocsView />
      </Suspense>
    ),
  },
  {
    path: "/:slug/*",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <DocsView />
      </Suspense>
    ),
  },
];

export const router = createBrowserRouter(routes);
