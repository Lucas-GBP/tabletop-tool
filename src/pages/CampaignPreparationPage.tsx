import type { CampaignDto } from "@/api";
import {
  CampaignWorkspace,
  CampaignWorkspaceHeader,
  WorkspaceFeedback,
} from "@/components";
import type { CoreWorkspace } from "@/hooks";
import type { SceneId, SessionId } from "@/types";
import styles from "./CampaignPreparationPage.module.scss";

interface CampaignPreparationPageProps {
  campaign: CampaignDto;
  workspace: CoreWorkspace;
  onBack: () => void;
  onManageScenes: () => void;
  onOpenScene: (sceneId: SceneId) => void;
  onStartSession: (sessionId: SessionId) => void;
}

export function CampaignPreparationPage({
  campaign,
  workspace,
  onBack,
  onManageScenes,
  onOpenScene,
  onStartSession,
}: CampaignPreparationPageProps) {
  return (
    <main className={styles.shell}>
      <CampaignWorkspaceHeader
        campaign={campaign}
        disabled={workspace.busy}
        onRename={(name) => workspace.renameCampaign(campaign.id, name)}
        onDelete={() => workspace.deleteCampaign(campaign.id)}
        onBack={onBack}
      />
      <WorkspaceFeedback error={workspace.error} />
      <div className={styles.workspace}>
        <CampaignWorkspace
          campaign={campaign}
          scenes={workspace.snapshot.scenes}
          sceneNames={workspace.sceneNames}
          disabled={workspace.busy}
          onManageScenes={onManageScenes}
          onOpenScene={onOpenScene}
          onStartSession={onStartSession}
          onCreateSession={(name, sceneId) =>
            workspace.createSession(campaign.id, name, sceneId)
          }
          onRenameSession={workspace.renameSession}
          onDeleteSession={workspace.deleteSession}
          onMoveSession={workspace.moveSession}
          onAssociateScene={workspace.associateScene}
          onMoveScene={workspace.moveScene}
          onRemoveScene={workspace.removeSceneFromSession}
        />
      </div>
    </main>
  );
}
