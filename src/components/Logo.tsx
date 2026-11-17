import { cn } from "@/lib/utils";

/** Logotipo provvisorio "gl0w up" (in attesa dell'SVG definitivo). */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("font-display font-bold leading-none tracking-tight", light ? "text-white" : "text-viola", className)}>
      gl<span className="text-arancione">0</span>w up
    </span>
  );
}
