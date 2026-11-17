import { Badge } from "@/components/ui/badge";
import { workStatusLabel, type WorkStatus } from "@/lib/types";

/** Etichette di stato dalla guida: Da approvare arancione, In modifica lilla, Approvato viola, Bozza violetto. */
export function WorkStatusBadge({ status, className }: { status: WorkStatus; className?: string }) {
  const variant = status === "da_approvare" ? "accent" : status === "in_modifica" ? "lilla" : status === "approvato" ? "success" : "outline";
  return <Badge variant={variant} className={className}>{workStatusLabel[status]}</Badge>;
}
