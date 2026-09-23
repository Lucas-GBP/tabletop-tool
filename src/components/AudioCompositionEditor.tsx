import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AudioCompositionDto,
  AudioCompositionInputDto,
  AudioListDto,
  AudioObjectDto,
  CompositionLayerInputDto,
} from "@/api";
import { Button, Input, Select } from "./primitives";
import styles from "./AudioCompositionEditor.module.scss";

interface AudioCompositionEditorProps {
  composition?: AudioCompositionDto;
  objects: readonly AudioObjectDto[];
  lists: readonly AudioListDto[];
  disabled: boolean;
  onSave: (input: AudioCompositionInputDto) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

interface LayerDraft {
  key: string;
  id: string | null;
  name: string;
  sourceValue: string;
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
}: AudioCompositionEditorProps) {
  const [name, setName] = useState(composition?.name ?? "");
  const [layers, setLayers] = useState<LayerDraft[]>(() =>
    composition ? layerDrafts(composition) : [],
  );

  const sources = [
    ...objects.map((object) => ({
      value: `audioObject:${object.id}`,
      label: `Objeto · ${object.name}`,
    })),
    ...lists.map((list) => ({
      value: `audioList:${list.id}`,
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
      <Input
        aria-label={
          composition
            ? `Nome da composição ${composition.name}`
            : "Nome da nova composição"
        }
        value={name}
        placeholder="Nome da composição"
        disabled={disabled}
        required
        onChange={(event) => setName(event.currentTarget.value)}
      />

      <ol className={styles.layers}>
        {layers.map((layer, index) => (
          <li key={layer.key}>
            <div className={styles.row}>
              <Input
                aria-label={`Nome da camada ${index + 1}`}
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
              <Select
                aria-label={`Fonte da camada ${layer.name || index + 1}`}
                value={layer.sourceValue}
                disabled={disabled}
                onChange={(event) =>
                  updateLayer(setLayers, index, {
                    sourceValue: event.currentTarget.value,
                  })
                }
              >
                {sources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={`Execução da camada ${layer.name || index + 1}`}
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
              <Select
                aria-label={`Ao desativar ${layer.name || index + 1}`}
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
                disabled={disabled || index === 0}
                onClick={() =>
                  setLayers((current) => move(current, index, index - 1))
                }
              >
                ↑
              </Button>
              <Button
                disabled={disabled || index === layers.length - 1}
                onClick={() =>
                  setLayers((current) => move(current, index, index + 1))
                }
              >
                ↓
              </Button>
              <Button
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
                sourceValue: sources[0]?.value ?? "",
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
        <Button type="submit" disabled={disabled || layers.length === 0}>
          {composition ? "Salvar composição" : "Criar composição"}
        </Button>
        {composition && onDelete && (
          <Button
            tone="danger"
            disabled={disabled}
            onClick={() => {
              if (!window.confirm(`Excluir a composição ${composition.name}?`))
                return;
              void onDelete();
            }}
          >
            Excluir composição
          </Button>
        )}
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
      sourceValue:
        layer.source.kind === "audioObject"
          ? `audioObject:${layer.source.audioObjectId}`
          : `audioList:${layer.source.audioListId}`,
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
  const [kind, id] = layer.sourceValue.split(":", 2);
  const source =
    kind === "audioList"
      ? { kind: "audioList" as const, audioListId: id ?? "" }
      : { kind: "audioObject" as const, audioObjectId: id ?? "" };
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
    source,
    execution,
    disableBehavior: layer.disableBehavior,
  };
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
