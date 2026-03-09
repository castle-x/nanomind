import PocketBase from "pocketbase";

export const pb = new PocketBase("/");

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

export function getCurrentUser() {
  return pb.authStore.record;
}
