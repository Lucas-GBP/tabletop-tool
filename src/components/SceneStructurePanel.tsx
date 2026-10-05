import type { SceneDto, SceneLevelDto } from "@/api";
import type { SceneLevelId } from "@/types";
import { ActionMenu } from "./ActionMenu";
import { Button, EditableText, Panel, SectionHeading } from "./primitives";
import styles from "./SceneStructurePanel.module.scss";

interface SceneStructurePanelProps {
  scene: SceneDto;
  level: SceneLevelDto;
  disabled: boolean;
  onRenameLevel: (levelId: SceneLevelId, name: string) => Promise<boolean>;
  onDeleteLevel: (levelId: SceneLevelId) => Promise<boolean>;
}

export function SceneStructurePanel({
  scene,
  level,
  disabled,
  onRenameLevel,
  onDeleteLevel,
}: SceneStructurePanelProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <header className={styles.header}>
        <SectionHeading eyebrow="Geral" title="Configuração do nível" />
        <ActionMenu label={`Mais ações para o nível ${level.name}`}>
          <Button
            tone="danger"
            disabled={disabled || scene.levels.length === 1}
            title={
              scene.levels.length === 1
                ? "A cena precisa manter ao menos um nível."
                : undefined
            }
            aria-label={`Excluir nível ${level.name}`}
            onClick={() => {
              if (window.confirm(`Excluir o nível ${level.name}?`)) {
                void onDeleteLevel(level.id);
              }
            }}
          >
            Excluir nível
          </Button>
        </ActionMenu>
      </header>
      <div className={styles.context}>
        <span>Cena</span>
        <strong>{scene.name}</strong>
        <span>Nível selecionado</span>
        <EditableText
          as="h3"
          value={level.name}
          label={`nome do nível ${level.name} da cena ${scene.name}`}
          disabled={disabled}
          onSave={(name) => onRenameLevel(level.id, name)}
        />
      </div>
      <p className={styles.hint}>
        Este nível mantém o mesmo runtime da cena e pode alterar a configuração
        das ferramentas sem criar outra cena.
      </p>
    </Panel>
  );
}
