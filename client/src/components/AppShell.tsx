import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext.js";

// The header every signed-in screen shares: the product name, the navigation for the role of the user (F-02: only
// what the role can use, which is a convenience; the API enforces the same rules), who is signed in, and Log out.

const ROLE_LABEL: Record<Role, string> = { REQUESTER: "Requester", REVIEWER: "Reviewer" };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [logoutFailed, setLogoutFailed] = useState(false);
  if (!user) return null;

  async function onLogout() {
    setLogoutFailed(false);
    if (!(await logout())) setLogoutFailed(true);
  }

  return (
    <>
      <header className="app-header">
        <span className="brand">Approval Flow</span>
        <nav aria-label="Main">
          {user.role === "REVIEWER" && <NavLink to="/reviews">Review Inbox</NavLink>}
          <NavLink to="/requests" end>
            My Requests
          </NavLink>
          <NavLink to="/requests/new">New Request</NavLink>
        </nav>
        <div className="who">
          <span>{user.name}</span>
          <span className="badge">{ROLE_LABEL[user.role]}</span>
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      {logoutFailed && (
        <p role="alert" className="form-error banner">
          Could not sign out. Please try again.
        </p>
      )}
      <main>{children}</main>
    </>
  );
}
