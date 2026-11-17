import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-prugna">{label}</span>
      {children}
    </label>
  );
}
