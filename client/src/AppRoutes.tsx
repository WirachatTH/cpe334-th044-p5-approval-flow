import { Navigate, Route, Routes } from "react-router-dom";
import { BuildFooter } from "./components/BuildFooter.js";
import { Checking } from "./components/Checking.js";
import { RequireAuth } from "./components/RequireAuth.js";
import { RequireRole } from "./components/RequireRole.js";
import { homeFor, useAuth } from "./context/AuthContext.js";
import { Login } from "./screens/Login.js";
import { MyRequests } from "./screens/MyRequests.js";
import { NewRequest } from "./screens/NewRequest.js";
import { NotAvailable } from "./screens/NotAvailable.js";
import { RequestDetail } from "./screens/RequestDetail.js";
import { ReviewInbox } from "./screens/ReviewInbox.js";

// The routes (SDS §4.1). Guards are a convenience for people: the API refuses the same calls on its own.

function Home() {
  const { status, user } = useAuth();
  if (status === "checking") return <Checking />;
  return <Navigate to={status === "signedIn" && user ? homeFor(user.role) : "/login"} replace />;
}

export function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route element={<RequireAuth />}>
          <Route path="/requests" element={<MyRequests />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route element={<RequireRole role="REVIEWER" />}>
            <Route path="/reviews" element={<ReviewInbox />} />
          </Route>
          <Route path="*" element={<NotAvailable />} />
        </Route>
      </Routes>
      <BuildFooter />
    </>
  );
}
