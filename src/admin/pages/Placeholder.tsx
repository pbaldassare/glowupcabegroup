import { Navigate, useParams } from "react-router-dom";
import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/common";
import { useAuth } from "@/lib/auth";
import { sections } from "../sections";

/** Sezioni del backoffice non ancora costruite. */
export function Placeholder() {
  const { section } = useParams();
  const { profile } = useAuth();
  const s = sections.find((x) => x.path === section);
  if (!s || !profile?.team_role || !s.roles.includes(profile.team_role)) return <Navigate to="/admin" replace />;
  return (
    <>
      <h1 className="mb-6 text-4xl">{s.label}</h1>
      <EmptyState icon={<Hammer className="h-8 w-8 text-arancione" />} title="Sezione in costruzione" text={s.description} />
    </>
  );
}
