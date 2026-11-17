import { SharedFiles } from "@/components/SharedFiles";
import { useAuth } from "@/lib/auth";
import { SubPage } from "./SubPage";

export function Materials() {
  const { profile } = useAuth();
  return (
    <SubPage title="Materiali condivisi">
      {profile?.company_id && <SharedFiles companyId={profile.company_id} meId={profile.id} canUpload canDeleteAll={false} />}
    </SubPage>
  );
}
