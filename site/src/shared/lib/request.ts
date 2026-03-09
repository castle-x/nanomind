// Patch global fetch to inject PocketBase auth token for all /api/ requests.
// Import this file once as a side effect in app/main.tsx.
import { pb } from "@/shared/lib/pb-client";

const _originalFetch = globalThis.fetch;

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

  if (url.startsWith("/api/")) {
    const token = pb.authStore.token;
    if (token) {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return _originalFetch(input, { ...init, headers });
    }
  }

  return _originalFetch(input, init);
};
