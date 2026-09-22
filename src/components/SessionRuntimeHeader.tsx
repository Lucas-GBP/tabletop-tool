import type { CampaignDto, SessionDto } from "@/api";
import { Button } from "./primitives";
import styles from "./SessionRuntimeHeader.module.scss";

interface SessionRuntimeHeaderProps {
  campaign: CampaignDto;
  session: SessionDto;
  onEnd: () => void;
}

export function SessionRuntimeHeader({
  campaign,
  session,
  onEnd,
}: SessionRuntimeHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.context}>
        <span className={styles.badge}>Mesa em andamento</span>
        <span>{campaign.name}</span>
      </div>
      <div className={styles.content}>
        <div>
          <p className={styles.eyebrow}>Executando sessão</p>
          <h1>{session.name}</h1>
          <p className={styles.subtitle}>
            Controle a cena e o nível ativos sem alterar a preparação salva.
          </p>
        </div>
        <Button className={styles.end} onClick={onEnd}>
          Encerrar sessão
        </Button>
      </div>
    </header>
  );
}
