import type { Role } from "@prisma/client";

// The route-policy table (F-02 contract §1.6): every route the API answers, and who may call it.
//
// SCAFFOLD STUB (#9, chore commit): the table is empty and nothing applies it. The policies, the origin guard,
// and the authorize middleware arrive with the F-02 implementation, after the failing tests that specify them.

export type Access =
  | { kind: "public" } // no session is looked up
  | { kind: "optional" } // the session is used when there is one
  | { kind: "roles"; roles: readonly Role[] }; // a session with one of these roles is required

export interface RoutePolicy {
  method: "GET" | "POST";
  path: string;
  access: Access;
}

export const ROUTE_POLICIES: readonly RoutePolicy[] = [];
