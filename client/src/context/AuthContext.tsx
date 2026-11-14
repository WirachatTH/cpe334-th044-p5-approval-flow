import type { ReactNode } from "react";

// Authentication state for the client (F-01 contract §1.2 "Client").
//
// SCAFFOLD STUB (#9, chore commit): no state, no calls. The session check, sign-in, sign-out, and the central
// handling of a 401 arrive with the F-01 implementation, after the failing tests that specify them.

export type Role = "REQUESTER" | "REVIEWER";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export type ApiRequest = (path: string, init?: RequestInit) => Promise<Response>;

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Every call to a protected endpoint goes through this function, so a 401 anywhere ends the session in one place.
export function useApi(): ApiRequest {
  return () => Promise.reject(new Error("not implemented"));
}
