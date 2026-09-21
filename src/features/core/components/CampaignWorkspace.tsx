import type { CampaignDto, SceneDto } from "../../../shared/api";
import { Button, Input, Panel, SectionHeading } from "../../../ui";
import { formValue } from "../lib/forms";
import { SceneSelect } from "./SceneSelect";
import { SessionCard } from "./SessionCard";
import styles from "./CampaignWorkspace.module.scss";

interface CampaignWorkspaceProps {
  campaign: CampaignDto;
  scenes: SceneDto[];
  sceneNames: Map<string, string>;
  disabled: boolean;
  onStartSession: (sessionId: string) => void;
  onCreateSession: (name: string, sceneId: string) => Promise<boolean>;
  onAssociateScene: (sessionId: string, sceneId: string) => Promise<boolean>;
}

export function CampaignWorkspace({
  campaign,
  scenes,
  sceneNames,
  disabled,
  onStartSession,
  onCreateSession,
  onAssociateScene,
}: CampaignWorkspaceProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Planejamento" title="Sessões" />
      <p className={styles.description}>
        Cada sessão organiza uma sequência de cenas reutilizáveis da Biblioteca.
      </p>

      <div className={styles.list}>
        {campaign.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            scenes={scenes}
            sceneNames={sceneNames}
            disabled={disabled}
            onStart={() => onStartSession(session.id)}
            onAssociate={(sceneId) => onAssociateScene(session.id, sceneId)}
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
