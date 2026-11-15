import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes.js";
import { AuthProvider } from "./context/AuthContext.js";

// react-router v7 future flags, opted into now: no console warnings and no change in behaviour today.
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={ROUTER_FUTURE}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
