import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { AppShell } from "./AppShell.js";
import { Checking } from "./Checking.js";

// Wraps every screen that needs a signed-in user. Signed out sends the visitor to Login; the server still refuses
// every protected call on its own.
export function RequireAuth() {
  const { status } = useAuth();
  if (status === "checking") return <Checking />;
  if (status === "signedOut") return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
