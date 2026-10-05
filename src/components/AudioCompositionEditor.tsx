import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AudioCompositionDto,
  AudioCompositionInputDto,
  AudioListDto,
  AudioObjectDto,
  CompositionLayerInputDto,
  CompositionLayerSourceInputDto,
} from "@/api";
import type { CompositionLayerId } from "@/types";
import { ActionMenu } from "./ActionMenu";
import { Button, Input, Select } from "./primitives";
import styles from "./AudioCompositionEditor.module.scss";

interface AudioCompositionEditorProps {
  composition?: AudioCompositionDto;
  objects: readonly AudioObjectDto[];
  lists: readonly AudioListDto[];
  disabled: boolean;
  onSave: (input: AudioCompositionInputDto) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onCancel?: () => void;
}

interface LayerDraft {
  key: string;
  id: CompositionLayerId | null;
  name: string;
  source: CompositionLayerSourceInputDto;
  execution: "continuous" | "randomInterval";
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  disableBehavior: "stop" | "finish";
}

export function AudioCompositionEditor({
  composition,
  objects,
  lists,
  disabled,
  onSave,
  onDelete,
  onCancel,
}: AudioCompositionEditorProps) {
  const [name, setName] = useState(composition?.name ?? "");
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    composition ? layerDrafts(composition) : [],
  );

  const sources = [
    ...objects.map((object) => ({
      value: `audioObject:${object.id}`,
      source: { kind: "audioObject" as const, audioObjectId: object.id },
      label: `Objeto · ${object.name}`,
    })),
    ...lists.map((list) => ({
      value: `audioList:${list.id}`,
      source: { kind: "audioList" as const, audioListId: list.id },
      label: `Lista · ${list.name}`,
    })),
  ];

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({ name, layers: layers.map(layerInput) }).then((saved) => {
          if (saved && !composition) {
            setName("");
            setLayers([]);
          }
        });
      }}
    >
      <label className={styles.field}>
        Nome
        <Input
          value={name}
          placeholder="Nome da composição"
          disabled={disabled}
          required
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </label>

      <ol className={styles.layers}>
        {layers.map((layer, index) => (
          <li key={layer.key}>
            <div className={styles.row}>
              <label className={styles.field}>
                Camada
                <Input
                  value={layer.name}
                  placeholder="Nome da camada"
                  disabled={disabled}
                  required
                  onChange={(event) =>
                    updateLayer(setLayers, index, {
                      name: event.currentTarget.value,
                    })
                  }
                />
              </label>
              <label className={styles.field}>
                Fonte
                <Select
                  value={sourceValue(layer.source)}
                  disabled={disabled}
                  onChange={(event) => {
                    const selected = sources.find(
                      (source) => source.value === event.currentTarget.value,
                    );
                    if (selected) {
                      updateLayer(setLayers, index, {
                        source: selected.source,
                      });
                    }
                  }}
                >
                  {sources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={styles.field}>
                Execução
                <Select
                  value={layer.execution}
                  disabled={disabled}
                  onChange={(event) =>
                    updateLayer(setLayers, index, {
                      execution: event.currentTarget
                        .value as LayerDraft["execution"],
                    })
                  }
                >
                  <option value="continuous">Contínua</option>
                  <option value="randomInterval">Intervalo aleatório</option>
                </Select>
              </label>
              <label className={styles.field}>
                Ao desativar
                <Select
                  value={layer.disableBehavior}
                  disabled={disabled}
                  onChange={(event) =>
                    updateLayer(setLayers, index, {
                      disableBehavior: event.currentTarget
                        .value as LayerDraft["disableBehavior"],
                    })
                  }
                >
                  <option value="stop">Parar</option>
                  <option value="finish">Finalizar naturalmente</option>
                </Select>
              </label>
            </div>
            {layer.execution === "randomInterval" && (
              <div className={styles.intervals}>
                <label>
                  Mínimo (s)
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={layer.minIntervalSeconds}
                    disabled={disabled}
                    onChange={(event) =>
                      updateLayer(setLayers, index, {
                        minIntervalSeconds:
                          event.currentTarget.valueAsNumber || 0,
                      })
                    }
                  />
                </label>
                <label>
                  Máximo (s)
                  <Input
                    type="number"
                    min={layer.minIntervalSeconds}
                    step={0.1}
                    value={layer.maxIntervalSeconds}
                    disabled={disabled}
                    onChange={(event) =>
                      updateLayer(setLayers, index, {
                        maxIntervalSeconds:
                          event.currentTarget.valueAsNumber || 0,
                      })
                    }
                  />
                </label>
              </div>
            )}
            <div className={styles["layer-actions"]}>
              <Button
                size="compact"
                disabled={disabled || index === 0}
                onClick={() =>
                  setLayers((current) => move(current, index, index - 1))
                }
              >
                ↑
              </Button>
              <Button
                size="compact"
                disabled={disabled || index === layers.length - 1}
                onClick={() =>
                  setLayers((current) => move(current, index, index + 1))
                }
              >
                ↓
              </Button>
              <Button
                size="compact"
                tone="danger"
                disabled={disabled}
                onClick={() =>
                  setLayers((current) =>
                    current.filter((_, layerIndex) => layerIndex !== index),
                  )
                }
              >
                Remover camada
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <Button
          disabled={disabled || sources.length === 0}
          onClick={() =>
            setLayers((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                id: null,
                name: `Camada ${current.length + 1}`,
                source: sources[0]!.source,
                execution: "continuous",
                minIntervalSeconds: 5,
                maxIntervalSeconds: 15,
                disableBehavior: "stop",
              },
            ])
          }
        >
          Adicionar camada
        </Button>
        <Button
          tone="primary"
          type="submit"
          disabled={disabled || layers.length === 0}
        >
          {composition ? "Salvar composição" : "Criar composição"}
        </Button>
        {composition && onDelete && (
          <ActionMenu label={`Mais ações para ${composition.name}`}>
            <Button
              tone="danger"
              disabled={disabled}
              onClick={() => {
                if (
                  !window.confirm(`Excluir a composição ${composition.name}?`)
                )
                  return;
                void onDelete();
              }}
            >
              Excluir composição
            </Button>
          </ActionMenu>
        )}
        {onCancel ? (
          <Button tone="subtle" disabled={disabled} onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function layerDrafts(composition: AudioCompositionDto): LayerDraft[] {
  return [...composition.layers]
    .sort((left, right) => left.position - right.position)
    .map((layer) => ({
      key: layer.id,
      id: layer.id,
      name: layer.name,
      source: layer.source,
      execution: layer.execution.kind,
      minIntervalSeconds:
        layer.execution.kind === "randomInterval"
          ? layer.execution.minIntervalUs / 1_000_000
          : 5,
      maxIntervalSeconds:
        layer.execution.kind === "randomInterval"
          ? layer.execution.maxIntervalUs / 1_000_000
          : 15,
      disableBehavior: layer.disableBehavior,
    }));
}

function layerInput(layer: LayerDraft): CompositionLayerInputDto {
  const execution =
    layer.execution === "randomInterval"
      ? {
          kind: "randomInterval" as const,
          minIntervalUs: Math.round(layer.minIntervalSeconds * 1_000_000),
          maxIntervalUs: Math.round(layer.maxIntervalSeconds * 1_000_000),
        }
      : { kind: "continuous" as const };
  return {
    id: layer.id,
    name: layer.name,
    source: layer.source,
    execution,
    disableBehavior: layer.disableBehavior,
  };
}

function sourceValue(source: CompositionLayerSourceInputDto) {
  return source.kind === "audioObject"
    ? `audioObject:${source.audioObjectId}`
    : `audioList:${source.audioListId}`;
}

function updateLayer(
  setLayers: Dispatch<SetStateAction<LayerDraft[]>>,
  index: number,
  patch: Partial<LayerDraft>,
) {
  setLayers((current) =>
    current.map((layer, layerIndex) =>
      layerIndex === index ? { ...layer, ...patch } : layer,
    ),
  );
}

function move<T>(items: readonly T[], from: number, to: number) {
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  if (item !== undefined) moved.splice(to, 0, item);
  return moved;
}
