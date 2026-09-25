import { useState } from "react";
import type { CampaignDto, SceneDto } from "@/api";
import type { SceneId, SessionId } from "@/types";
import { SessionEditor } from "./SessionEditor";
import { SessionList } from "./SessionList";
import styles from "./CampaignWorkspace.module.scss";

interface CampaignWorkspaceProps {
  campaign: CampaignDto;
  scenes: SceneDto[];
  sceneNames: Map<SceneId, string>;
  disabled: boolean;
  onManageScenes: () => void;
  onOpenScene: (sceneId: SceneId) => void;
  onStartSession: (sessionId: SessionId) => void;
  onCreateSession: (name: string, sceneId: SceneId) => Promise<boolean>;
  onRenameSession: (sessionId: SessionId, name: string) => Promise<boolean>;
  onDeleteSession: (sessionId: SessionId) => Promise<boolean>;
  onMoveSession: (sessionId: SessionId, position: number) => Promise<boolean>;
  onAssociateScene: (
    sessionId: SessionId,
    sceneId: SceneId,
  ) => Promise<boolean>;
  onMoveScene: (
    sessionId: SessionId,
    sceneId: SceneId,
    position: number,
  ) => Promise<boolean>;
  onRemoveScene: (sessionId: SessionId, sceneId: SceneId) => Promise<boolean>;
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
