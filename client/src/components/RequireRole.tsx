import { Outlet } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext.js";
import { NotAvailable } from "../screens/NotAvailable.js";

// A screen for one role. Any other role sees "not available" and no API call is made (F-02 AC-F02-12).
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  return user?.role === role ? <Outlet /> : <NotAvailable />;
}
