import type { CampaignDto, SceneDto } from "@/api";
import { Button, Input, Panel, SectionHeading } from "./primitives";
import { formValue } from "@/lib";
import { SceneSelect } from "./SceneSelect";
import { SessionCard } from "./SessionCard";
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
  onAssociateScene: (sessionId: string, sceneId: string) => Promise<boolean>;
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
  onAssociateScene,
  onRemoveScene,
}: CampaignWorkspaceProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Planejamento" title="Sessões" />
      <p className={styles.description}>
        Cada sessão organiza uma sequência de cenas reutilizáveis.
      </p>

      <div className={styles.list}>
        {campaign.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            scenes={scenes}
            sceneNames={sceneNames}
            disabled={disabled}
            canDelete={campaign.sessions.length > 1}
            onManageScenes={onManageScenes}
            onOpenScene={onOpenScene}
            onStart={() => onStartSession(session.id)}
            onRename={(name) => onRenameSession(session.id, name)}
            onDelete={() => onDeleteSession(session.id)}
            onAssociate={(sceneId) => onAssociateScene(session.id, sceneId)}
            onRemoveScene={(sceneId) => onRemoveScene(session.id, sceneId)}
          />
        ))}
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const name = formValue(data, "sessionName");
          const sceneId = formValue(data, "sessionScene");
          void onCreateSession(name, sceneId).then(
            (created) => created && form.reset(),
          );
        }}
      >
        <Input
          name="sessionName"
          aria-label={`Nome da nova sessão de ${campaign.name}`}
          placeholder="Nova sessão"
          required
        />
        <SceneSelect
          name="sessionScene"
          label={`Cena inicial da nova sessão de ${campaign.name}`}
          scenes={scenes}
          placeholder="Cena inicial da sessão"
        />
        <Button type="submit" disabled={disabled}>
          Adicionar sessão
        </Button>
      </form>
    </Panel>
  );
}
