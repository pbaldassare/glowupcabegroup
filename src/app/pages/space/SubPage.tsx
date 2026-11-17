import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";

/** Pagina interna di Il mio spazio: freccia indietro e titolo (mockup C11). */
export function SubPage({ title, children, back = "/il-mio-spazio" }: { title: string; children: ReactNode; back?: string }) {
  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <BackButton to={back} />
        <h1 className="font-sans text-2xl font-semibold">{title}</h1>
      </div>
      {children}
    </>
  );
}
