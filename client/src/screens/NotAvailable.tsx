import { Link } from "react-router-dom";

export function NotAvailable() {
  return (
    <section>
      <h1>Not available</h1>
      <p>This page is not available to you.</p>
      <Link to="/requests">Back to My Requests</Link>
    </section>
  );
}
