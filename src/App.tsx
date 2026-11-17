import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { FullScreenSpinner } from "@/components/common";
import { AppLayout } from "@/app/AppLayout";
import { Welcome } from "@/app/pages/Welcome";
import { Login } from "@/app/pages/Login";
import { Signup } from "@/app/pages/Signup";
import { SetPassword } from "@/app/pages/SetPassword";
import { NotEnabled } from "@/app/pages/NotEnabled";
import { Home } from "@/app/pages/Home";
import { VisitorHome } from "@/app/pages/VisitorHome";
import { Works } from "@/app/pages/Works";
import { Messages } from "@/app/pages/Messages";
import { Calendar } from "@/app/pages/Calendar";
import { MySpace } from "@/app/pages/MySpace";
import { Tips } from "@/app/pages/Tips";
import { AdminLayout } from "@/admin/AdminLayout";
import { Overview } from "@/admin/pages/Overview";
import { Clients } from "@/admin/pages/Clients";
import { Placeholder } from "@/admin/pages/Placeholder";

/** Area app: solo clienti e visitatori. Il team viene mandato al backoffice. */
function RequireApp({ children, clientOnly = false }: { children: ReactNode; clientOnly?: boolean }) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/benvenuto" replace state={{ from: location.pathname }} />;
  if (!profile) return <NotEnabled />;
  if (profile.kind === "team") return <Navigate to="/admin" replace />;
  if (clientOnly && profile.kind !== "cliente") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Area backoffice: solo il team. */
function RequireTeam({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/accedi?area=admin" replace />;
  if (!profile) return <NotEnabled />;
  if (profile.kind !== "team") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeSwitch() {
  const { profile } = useAuth();
  return profile?.kind === "visitatore" ? <VisitorHome /> : <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/benvenuto" element={<Welcome />} />
      <Route path="/accedi" element={<Login />} />
      <Route path="/registrati" element={<Signup />} />
      <Route path="/imposta-password" element={<SetPassword />} />

      <Route element={<RequireApp><AppLayout /></RequireApp>}>
        <Route index element={<HomeSwitch />} />
        <Route path="messaggi" element={<Messages />} />
        <Route path="consigli" element={<Tips />} />
        <Route path="lavori" element={<RequireApp clientOnly><Works /></RequireApp>} />
        <Route path="calendario" element={<RequireApp clientOnly><Calendar /></RequireApp>} />
        <Route path="il-mio-spazio" element={<MySpace />} />
      </Route>

      {/* Link degli inviti del team (GLOWUP_ADMIN_URL + /imposta-password) */}
      <Route path="/admin/imposta-password" element={<SetPassword />} />
      <Route path="/admin" element={<RequireTeam><AdminLayout /></RequireTeam>}>
        <Route index element={<Overview />} />
        <Route path="clienti" element={<Clients />} />
        <Route path=":section" element={<Placeholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
