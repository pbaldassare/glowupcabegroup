import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isAppMode } from "@/lib/pwa";
import { InstallApp } from "@/app/pages/InstallApp";
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
import { VisitorQuestionnaire } from "@/app/pages/VisitorQuestionnaire";
import { Works } from "@/app/pages/Works";
import { Messages } from "@/app/pages/Messages";
import { Calendar } from "@/app/pages/Calendar";
import { MySpace } from "@/app/pages/MySpace";
import { Tips } from "@/app/pages/Tips";
import { WorkView } from "@/app/pages/works/WorkView";
import { RequestChanges } from "@/app/pages/works/RequestChanges";
import { Approved } from "@/app/pages/works/Approved";
import { Contract } from "@/app/pages/space/Contract";
import { Services } from "@/app/pages/space/Services";
import { Invoices } from "@/app/pages/space/Invoices";
import { Archive } from "@/app/pages/space/Archive";
import { Materials } from "@/app/pages/space/Materials";
import { Settings } from "@/app/pages/space/Settings";
import { Survey } from "@/app/pages/space/Survey";
import { AdminLayout } from "@/admin/AdminLayout";
import { Overview } from "@/admin/pages/Overview";
import { Clients } from "@/admin/pages/Clients";
import { AdminMessages } from "@/admin/pages/Messages";
import { AdminWorks } from "@/admin/pages/Works";
import { WorkNew } from "@/admin/pages/WorkNew";
import { WorkDetail } from "@/admin/pages/WorkDetail";
import { ClientDetail } from "@/admin/pages/ClientDetail";
import { AdminInvoices } from "@/admin/pages/Invoices";
import { AdminCalendar } from "@/admin/pages/Calendar";
import { Requests } from "@/admin/pages/Requests";
import { Questionnaires } from "@/admin/pages/Questionnaires";
import { AdminProjects } from "@/admin/pages/Projects";
import { ProjectDetail } from "@/admin/pages/ProjectDetail";
import { ProjectView } from "@/app/pages/ProjectView";
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
  if (!session) return <Navigate to="/accedi" replace />;
  if (!profile) return <NotEnabled />;
  if (profile.kind !== "team") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeSwitch() {
  const { profile } = useAuth();
  return profile?.kind === "visitatore" ? <VisitorHome /> : <Home />;
}

/** Nel browser: home page per scaricare l'app; il login serve solo al team. */
function InstallRoute() {
  const location = useLocation();
  return <InstallApp notice={(location.state as { notice?: string } | null)?.notice} />;
}

const adminRoutes = (
  <>
    {/* Link degli inviti del team (GLOWUP_ADMIN_URL + /imposta-password) */}
    <Route path="/admin/imposta-password" element={<SetPassword />} />
    <Route path="/admin" element={<RequireTeam><AdminLayout /></RequireTeam>}>
      <Route index element={<Overview />} />
      <Route path="clienti" element={<Clients />} />
      <Route path="clienti/:id" element={<ClientDetail />} />
      <Route path="fatture" element={<AdminInvoices />} />
      <Route path="calendario" element={<AdminCalendar />} />
      <Route path="richieste" element={<Requests />} />
      <Route path="questionari" element={<Questionnaires />} />
      <Route path="progetti" element={<AdminProjects />} />
      <Route path="progetti/:id" element={<ProjectDetail />} />
      <Route path="lavori" element={<AdminWorks />} />
      <Route path="lavori/nuovo" element={<WorkNew />} />
      <Route path="lavori/:id" element={<WorkDetail />} />
      <Route path="messaggi" element={<AdminMessages />} />
      <Route path="messaggi/:id" element={<AdminMessages />} />
      <Route path=":section" element={<Placeholder />} />
    </Route>
  </>
);

export default function App() {
  // La modalità non cambia mentre l'app è aperta: la calcoliamo una volta.
  const appMode = isAppMode();

  if (!appMode) {
    return (
      <Routes>
        <Route path="/" element={<InstallRoute />} />
        <Route path="/accedi" element={<Login teamOnly />} />
        <Route path="/imposta-password" element={<SetPassword />} />
        {adminRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

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
        <Route path="progetti/:id" element={<RequireApp clientOnly><ProjectView /></RequireApp>} />
        <Route path="calendario" element={<RequireApp clientOnly><Calendar /></RequireApp>} />
        <Route path="il-mio-spazio" element={<MySpace />} />
        <Route path="il-mio-spazio/impostazioni" element={<Settings />} />
        <Route path="il-mio-spazio/contratto" element={<RequireApp clientOnly><Contract /></RequireApp>} />
        <Route path="il-mio-spazio/servizi" element={<RequireApp clientOnly><Services /></RequireApp>} />
        <Route path="il-mio-spazio/fatture" element={<RequireApp clientOnly><Invoices /></RequireApp>} />
        <Route path="il-mio-spazio/archivio" element={<RequireApp clientOnly><Archive /></RequireApp>} />
        <Route path="il-mio-spazio/materiali" element={<RequireApp clientOnly><Materials /></RequireApp>} />
        <Route path="il-mio-spazio/gradimento" element={<RequireApp clientOnly><Survey /></RequireApp>} />
      </Route>

      {/* Schermate a tutto schermo, senza barra in basso (mockup C4–C6, V3) */}
      <Route path="/questionario" element={<RequireApp><VisitorQuestionnaire /></RequireApp>} />
      <Route path="/lavori/:id" element={<RequireApp clientOnly><WorkView /></RequireApp>} />
      <Route path="/lavori/:id/modifiche" element={<RequireApp clientOnly><RequestChanges /></RequireApp>} />
      <Route path="/lavori/:id/approvato" element={<RequireApp clientOnly><Approved /></RequireApp>} />

      {adminRoutes}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
