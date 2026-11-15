import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Authentication state for the client (F-01 contract §1.2 "Client"). The browser holds only the HttpOnly session
// cookie; this context asks the server who the user is (GET /api/auth/me) and never decides anything itself.

export type Role = "REQUESTER" | "REVIEWER";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export type ApiRequest = (path: string, init?: RequestInit) => Promise<Response>;

type Status = "checking" | "signedIn" | "signedOut";

export type LoginResult = { ok: true } | { ok: false; status: number; code?: string; retryAfterSeconds?: number };

interface AuthValue {
  status: Status;
  user: SessionUser | null;
  // True after a protected call found the session gone (shown on the Login screen).
  sessionEnded: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<boolean>;
  request: ApiRequest;
}

const AuthContext = createContext<AuthValue | null>(null);

const JSON_HEADERS = { "Content-Type": "application/json" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; user: SessionUser | null; sessionEnded: boolean }>({
    status: "checking",
    user: null,
    sessionEnded: false,
  });

  // On load: who am I? A 401 just means nobody is signed in.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!active) return;
        if (res.ok) setState({ status: "signedIn", user: (await res.json()).user, sessionEnded: false });
        else setState({ status: "signedOut", user: null, sessionEnded: false });
      })
      .catch(() => active && setState({ status: "signedOut", user: null, sessionEnded: false }));
    return () => {
      active = false;
    };
  }, []);

  // Every call to a protected endpoint goes through here, so a 401 anywhere ends the session in one place.
  const request = useCallback<ApiRequest>(async (path, init = {}) => {
    const res = await fetch(path, { ...init, credentials: "include", headers: { ...JSON_HEADERS, ...init.headers } });
    if (res.status === 401) {
      setState((s) => (s.status === "signedIn" ? { status: "signedOut", user: null, sessionEnded: true } : s));
    }
    return res;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      // Not through `request`: a 401 here means wrong credentials, not an ended session.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: JSON_HEADERS,
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setState({ status: "signedIn", user: (await res.json()).user, sessionEnded: false });
        return { ok: true };
      }
      const body = await res.json().catch(() => null);
      const retryAfter = Number(res.headers.get("Retry-After"));
      return {
        ok: false,
        status: res.status,
        code: body?.error?.code,
        retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      };
    } catch {
      return { ok: false, status: 0 };
    }
  }, []);

  // Signing out is complete only when the server has ended the session; on failure the user stays signed in.
  const logout = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      setState({ status: "signedOut", user: null, sessionEnded: false });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ ...state, login, logout, request }),
    [state, login, logout, request],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

// The function screens use to call protected endpoints.
export function useApi(): ApiRequest {
  return useAuth().request;
}

export function homeFor(role: Role): string {
  return role === "REVIEWER" ? "/reviews" : "/requests";
}
