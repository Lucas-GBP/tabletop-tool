import {
  Button,
  CampaignHome,
  SceneLibrary,
  WorkspaceFeedback,
  WorkspaceHeader,
} from "@/components";
import type { CoreWorkspace } from "@/hooks";
import styles from "./CampaignListPage.module.scss";

interface CampaignListPageProps {
  workspace: CoreWorkspace;
  onOpenCampaign: (campaignId: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenAudioLibrary: () => void;
  onOpenSettings: () => void;
}

export function CampaignListPage({
  workspace,
  onOpenCampaign,
  onOpenScene,
  onOpenAudioLibrary,
  onOpenSettings,
}: CampaignListPageProps) {
  return (
    <main className={styles.shell}>
      <WorkspaceHeader
        campaignCount={workspace.snapshot.campaigns.length}
        sceneCount={workspace.snapshot.scenes.length}
      />
      <WorkspaceFeedback error={workspace.error} notice={workspace.notice} />
      <nav className={styles.tools} aria-label="Ferramentas globais">
        <Button tone="primary" onClick={onOpenAudioLibrary}>
          Audio Mixer
        </Button>
        <Button tone="subtle" onClick={onOpenSettings}>
          Configurações
        </Button>
      </nav>
      <div className={styles.home}>
        <CampaignHome
          campaigns={workspace.snapshot.campaigns}
          disabled={workspace.busy}
          onCreateCampaign={workspace.createCampaign}
          onOpenCampaign={onOpenCampaign}
        />
        <SceneLibrary
          scenes={workspace.snapshot.scenes}
          disabled={workspace.busy}
          onCreateScene={workspace.createScene}
          onOpenScene={onOpenScene}
        />
      </div>
    </main>
  );
}
