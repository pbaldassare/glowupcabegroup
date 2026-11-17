import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

/** Schermate di accesso: sfondo viola, logo e scheda chiara. */
export function AuthShell({ title, subtitle, children, back = "/benvenuto" }: { title: string; subtitle?: string; children: ReactNode; back?: string | null }) {
  return (
    <div className="flex min-h-dvh flex-col bg-viola">
      <div className="mx-auto w-full max-w-md px-6 pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
        <Link to={back ?? "/"} aria-label="Indietro">
          <Logo light className="text-3xl" />
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 rounded-t-[2rem] bg-avorio px-6 pb-10 pt-8">
        <h1 className="mb-2 text-2xl">{title}</h1>
        {subtitle && <p className="mb-6 text-violetto">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
