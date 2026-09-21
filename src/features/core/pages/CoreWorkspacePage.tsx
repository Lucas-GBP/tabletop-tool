import { useState } from "react";
import { FeedbackMessage } from "../../../ui";
import { SessionRuntimePage } from "../../session-runner/pages/SessionRuntimePage";
import { CampaignHome } from "../components/CampaignHome";
import { CampaignWorkspace } from "../components/CampaignWorkspace";
import { CampaignWorkspaceHeader } from "../components/CampaignWorkspaceHeader";
import { SceneLibrary } from "../components/SceneLibrary";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { useCoreWorkspace } from "../hooks/useCoreWorkspace";
import styles from "./CoreWorkspacePage.module.scss";

export function CoreWorkspacePage() {
  const workspace = useCoreWorkspace();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);

  if (workspace.loading) {
    return <main className={styles.loading}>Abrindo seu espaço de jogo…</main>;
  }

  const selectedCampaign = workspace.snapshot.campaigns.find(
    (campaign) => campaign.id === selectedCampaignId,
  );
  const runningSession = selectedCampaign?.sessions.find(
    (session) => session.id === runningSessionId,
  );

  if (selectedCampaign && runningSession) {
    return (
      <SessionRuntimePage
        campaign={selectedCampaign}
        session={runningSession}
        scenes={workspace.snapshot.scenes}
        onEnd={() => setRunningSessionId(null)}
      />
    );
  }

  return (
    <main className={styles["app-shell"]}>
      {selectedCampaign ? (
        <CampaignWorkspaceHeader
          campaign={selectedCampaign}
          disabled={workspace.busy}
          onRename={(name) =>
            workspace.renameCampaign(selectedCampaign.id, name)
          }
          onBack={() => {
            setRunningSessionId(null);
            setSelectedCampaignId(null);
          }}
        />
      ) : (
        <WorkspaceHeader
          campaignCount={workspace.snapshot.campaigns.length}
          sceneCount={workspace.snapshot.scenes.length}
        />
      )}

      {workspace.error && (
        <FeedbackMessage role="alert" tone="error" className={styles.feedback}>
          {workspace.error}
        </FeedbackMessage>
      )}
      <FeedbackMessage role="status" tone="success" className={styles.feedback}>
        {workspace.notice}
      </FeedbackMessage>

      {selectedCampaign ? (
        <div className={styles.workspace}>
          <SceneLibrary
            scenes={workspace.snapshot.scenes}
            disabled={workspace.busy}
            onCreateScene={workspace.createScene}
            onCreateLevel={workspace.createSceneLevel}
            onRenameScene={workspace.renameScene}
            onRenameLevel={workspace.renameSceneLevel}
          />
          <CampaignWorkspace
            campaign={selectedCampaign}
            scenes={workspace.snapshot.scenes}
            sceneNames={workspace.sceneNames}
            disabled={workspace.busy}
            onStartSession={setRunningSessionId}
            onCreateSession={(name, sceneId) =>
              workspace.createSession(selectedCampaign.id, name, sceneId)
            }
            onAssociateScene={workspace.associateScene}
          />
        </div>
      ) : (
        <div className={styles.home}>
          <CampaignHome
            campaigns={workspace.snapshot.campaigns}
            disabled={workspace.busy}
            onCreateCampaign={workspace.createCampaign}
            onOpenCampaign={setSelectedCampaignId}
          />
        </div>
      )}
    </main>
  );
}
