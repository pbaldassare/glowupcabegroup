import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Finestra in primo piano: centrata su computer, dal basso (bottom sheet) su telefono. */
export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-prugna/50 sm:items-center" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn("max-h-[90dvh] w-full overflow-y-auto rounded-t-[2rem] bg-avorio p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:max-w-lg sm:rounded-[2rem] sm:p-8", className)}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-violetto/30 sm:hidden" />
        {children}
      </div>
    </div>
  );
}
