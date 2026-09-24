import { useState } from "react";
import type { CampaignDto, SceneDto } from "@/api";
import { SessionEditor } from "./SessionEditor";
import { SessionList } from "./SessionList";
import styles from "./CampaignWorkspace.module.scss";

interface CampaignWorkspaceProps {
  campaign: CampaignDto;
  scenes: SceneDto[];
  sceneNames: Map<string, string>;
  disabled: boolean;
  onManageScenes: () => void;
  onOpenScene: (sceneId: string) => void;
  onStartSession: (sessionId: string) => void;
  onCreateSession: (name: string, sceneId: string) => Promise<boolean>;
  onRenameSession: (sessionId: string, name: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onMoveSession: (sessionId: string, position: number) => Promise<boolean>;
  onAssociateScene: (sessionId: string, sceneId: string) => Promise<boolean>;
  onMoveScene: (
    sessionId: string,
    sceneId: string,
    position: number,
  ) => Promise<boolean>;
  onRemoveScene: (sessionId: string, sceneId: string) => Promise<boolean>;
}

export function CampaignWorkspace({
  campaign,
  scenes,
  sceneNames,
  disabled,
  onManageScenes,
  onOpenScene,
  onStartSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onMoveSession,
  onAssociateScene,
  onMoveScene,
  onRemoveScene,
}: CampaignWorkspaceProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    campaign.sessions[0]?.id ?? "",
  );
  const selectedSession =
    campaign.sessions.find((session) => session.id === selectedSessionId) ??
    campaign.sessions[0];

  if (!selectedSession) return null;

  return (
    <div className={styles.workspace}>
      <SessionList
        campaignName={campaign.name}
        sessions={campaign.sessions}
        scenes={scenes}
        selectedSessionId={selectedSession.id}
        disabled={disabled}
        onSelect={setSelectedSessionId}
        onCreate={onCreateSession}
        onMove={onMoveSession}
      />
      <SessionEditor
        key={selectedSession.id}
        session={selectedSession}
        scenes={scenes}
        sceneNames={sceneNames}
        disabled={disabled}
        canDelete={campaign.sessions.length > 1}
        onManageScenes={onManageScenes}
        onOpenScene={onOpenScene}
        onStart={() => onStartSession(selectedSession.id)}
        onRename={(name) => onRenameSession(selectedSession.id, name)}
        onDelete={() => onDeleteSession(selectedSession.id)}
        onAssociate={(sceneId) => onAssociateScene(selectedSession.id, sceneId)}
        onMoveScene={(sceneId, position) =>
          onMoveScene(selectedSession.id, sceneId, position)
        }
        onRemoveScene={(sceneId) => onRemoveScene(selectedSession.id, sceneId)}
      />
    </div>
  );
}
