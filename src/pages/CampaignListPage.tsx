import { CampaignHome, WorkspaceFeedback, WorkspaceHeader } from "@/components";
import type { CoreWorkspace } from "@/hooks";
import type { CampaignId } from "@/types";
import styles from "./CampaignListPage.module.scss";

interface CampaignListPageProps {
  workspace: CoreWorkspace;
  onOpenCampaign: (campaignId: CampaignId) => void;
}

export function CampaignListPage({
  workspace,
  onOpenCampaign,
}: CampaignListPageProps) {
  return (
    <main className={styles.shell}>
      <WorkspaceHeader campaignCount={workspace.snapshot.campaigns.length} />
      <WorkspaceFeedback error={workspace.error} />
      <div className={styles.home}>
        <CampaignHome
          campaigns={workspace.snapshot.campaigns}
          disabled={workspace.busy}
          onCreateCampaign={workspace.createCampaign}
          onOpenCampaign={onOpenCampaign}
        />
      </div>
    </main>
  );
}
