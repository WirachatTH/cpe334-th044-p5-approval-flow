// Shown while the first GET /api/auth/me is in flight (F-01 contract §2.1).
export function Checking() {
  return (
    <div className="centered" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>Checking your session…</p>
    </div>
  );
}
