import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Cerchio con la freccia indietro, come nei mockup. */
export function BackButton({ to, label = "Indietro", onClickOverride }: { to?: string; label?: string; onClickOverride?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (onClickOverride ? onClickOverride() : to ? navigate(to) : navigate(-1))}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-viola"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}
