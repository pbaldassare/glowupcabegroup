import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { roleLabel, sections } from "./sections";

/** Backoffice: barra laterale viola su computer, menu orizzontale su telefono. */
export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const visible = sections.filter((s) => profile?.team_role && s.roles.includes(profile.team_role));

  const link = () =>
    ({ isActive }: { isActive: boolean }) =>
      cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
        isActive ? "bg-prugna text-white shadow-[inset_3px_0_0_#FF8427]" : "text-white/80 hover:bg-white/10",
      );

  return (
    <div className="min-h-dvh bg-avorio lg:flex">
      <aside className="bg-viola text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:flex-col lg:p-6">
        <div className="flex items-center justify-between px-5 py-4 lg:mb-8 lg:p-0">
          <Logo light className="text-3xl" />
          <button onClick={signOut} className="lg:hidden" aria-label="Esci"><LogOut className="h-5 w-5" /></button>
        </div>
        <nav aria-label="Sezioni del pannello" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:overflow-visible lg:p-0">
          <ul className="flex gap-1 lg:flex-col">
            {visible.map(({ path, label, icon: Icon }) => (
              <li key={path} className="shrink-0">
                <NavLink to={path === "" ? "/admin" : `/admin/${path}`} end={path === ""} className={link()}>
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-3 border-t border-white/15 pt-5 lg:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-arancione font-semibold">{(profile?.full_name ?? "?").charAt(0).toUpperCase()}</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="text-white/70">{profile?.team_role ? roleLabel[profile.team_role] : ""}</p>
          </div>
          <button onClick={signOut} aria-label="Esci" className="rounded-full p-2 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
        </div>
      </aside>
      <main className="flex-1 px-5 py-6 lg:px-12 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
