import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, Home, Lightbulb, LayoutGrid, MessageSquareText, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Tab = { to: string; label: string; icon: typeof Home; center?: boolean };

const clientTabs: Tab[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/lavori", label: "Lavori", icon: LayoutGrid },
  { to: "/messaggi", label: "Messaggi", icon: MessageSquareText, center: true },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/il-mio-spazio", label: "Il mio spazio", icon: Package },
];

const visitorTabs: Tab[] = [
  { to: "/", label: "La tua richiesta", icon: Home },
  { to: "/messaggi", label: "Messaggi", icon: MessageSquareText, center: true },
  { to: "/consigli", label: "Consigli", icon: Lightbulb },
];

/** Struttura dell'app su telefono: contenuto + barra in basso con Messaggi al centro. */
export function AppLayout() {
  const { profile } = useAuth();
  const tabs = profile?.kind === "visitatore" ? visitorTabs : clientTabs;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main className="flex-1 px-5 pb-32 pt-[max(env(safe-area-inset-top),1.5rem)]">
        <Outlet />
      </main>
      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-avorio/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="flex items-end justify-around px-2 pt-2">
          {tabs.map(({ to, label, icon: Icon, center }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 pb-2 text-[11px]",
                    isActive ? "font-semibold text-arancione" : "text-violetto",
                    center && "-mt-6",
                  )
                }
              >
                {center ? (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-arancione text-white shadow-lg ring-4 ring-avorio">
                    <Icon className="h-7 w-7" />
                  </span>
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                <span className="text-center leading-tight">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Intestazione delle pagine: data in piccolo + titolo. */
export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-3xl">{title}</h1>
      </div>
      {action}
    </header>
  );
}
