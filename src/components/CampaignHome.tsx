import type { CampaignDto } from "@/api";
import { Button, EmptyState, Input, Panel, SectionHeading } from "./primitives";
import { formValue } from "@/lib";
import { CampaignSummaryCard } from "./CampaignSummaryCard";
import styles from "./CampaignHome.module.scss";

interface CampaignHomeProps {
  campaigns: CampaignDto[];
  disabled: boolean;
  onCreateCampaign: (name: string) => Promise<string | undefined>;
  onOpenCampaign: (campaignId: string) => void;
}

export function CampaignHome({
  campaigns,
  disabled,
  onCreateCampaign,
  onOpenCampaign,
}: CampaignHomeProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Início" title="Campanhas" />
      <p className={styles.description}>
        Entre em uma campanha para preparar suas sessões, cenas e ferramentas.
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = formValue(new FormData(form), "campaignName");
          void onCreateCampaign(name).then((campaignId) => {
            if (!campaignId) return;
            form.reset();
            onOpenCampaign(campaignId);
          });
        }}
      >
        <Input
          name="campaignName"
          aria-label="Nome da nova campanha"
          placeholder="Nome da campanha"
          required
        />
        <Button type="submit" disabled={disabled}>
          Criar campanha
        </Button>
      </form>

      {campaigns.length === 0 ? (
        <EmptyState title="Crie sua primeira campanha" icon="✦" size="spacious">
          Ela começará com uma sessão e uma cena inicial, prontas para você
          editar.
        </EmptyState>
      ) : (
        <div className={styles.list}>
          {campaigns.map((campaign) => (
            <CampaignSummaryCard
              key={campaign.id}
              campaign={campaign}
              onOpen={() => onOpenCampaign(campaign.id)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
