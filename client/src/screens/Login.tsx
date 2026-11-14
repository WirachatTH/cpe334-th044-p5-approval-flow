import { useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Checking } from "../components/Checking.js";
import { homeFor, useAuth, type LoginResult } from "../context/AuthContext.js";

// The Login screen (F-01 contract §2.1): validation beneath each field, one message per outcome, a busy state.

function messageFor(result: Extract<LoginResult, { ok: false }>): string {
  if (result.status === 401) return "Email or password is incorrect.";
  if (result.status === 429) {
    const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 60) / 60));
    return `Too many sign-in attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  }
  if (result.status === 403 && result.code === "ACCOUNT_INACTIVE") return "This account is inactive.";
  return "Something went wrong. Please try again.";
}

export function Login() {
  const { status, user, sessionEnded, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (status === "checking") return <Checking />;
  if (status === "signedIn" && user) return <Navigate to={homeFor(user.role)} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    // The same rules as the API, for fast feedback; nothing is sent while a field is invalid.
    const next: { email?: string; password?: string } = {};
    if (email.trim() === "") next.email = "Enter your email address.";
    if (password === "") next.password = "Enter your password.";
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) {
      setPassword("");
      setFailure(messageFor(result));
    }
  }

  return (
    <main className="login">
      <h1>Sign in</h1>
      {sessionEnded && <p role="status">Your session has ended. Please log in again.</p>}
      {failure && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            ref={emailRef}
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" className="field-error">
              {errors.password}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
