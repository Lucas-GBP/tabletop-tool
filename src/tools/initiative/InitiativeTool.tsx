import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { EntityWorkspace } from "../../components/entity-workspace/EntityWorkspace";
import {
  INITIATIVE_STORE_SCHEMA_VERSION,
  createEntityId,
  emptyInitiativeStore,
  loadInitiativeStore,
  saveInitiativeStore,
} from "../../domain/domainStores";
import type {
  InitiativeEncounterConfig,
  InitiativeParticipantConfig,
  InitiativeParticipantRole,
} from "../../domain";
import styles from "../shared/DomainTool.module.scss";

const roles = [
  { id: "player", label: "Jogador" },
  { id: "creature", label: "Criatura" },
  { id: "npc", label: "NPC" },
  { id: "other", label: "Outro" },
] as const satisfies Array<{ id: InitiativeParticipantRole; label: string }>;

function createEncounter(): InitiativeEncounterConfig {
  return {
    id: createEntityId("initiative-encounter"),
    name: "Novo encontro",
    description: "",
    participants: [],
  };
}

function createParticipant(): InitiativeParticipantConfig {
  return {
    id: createEntityId("initiative-participant"),
    name: "Nova criatura",
    role: "creature",
    initiativeModifier: 0,
    armorClass: null,
    hitPoints: null,
    notes: "",
  };
}

function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? Math.round(parsedValue) : null;
}

export function InitiativeTool() {
  const [encounters, setEncounters] = createSignal<InitiativeEncounterConfig[]>(
    emptyInitiativeStore().encounters
  );
  const [selectedId, setSelectedId] = createSignal<string>();
  const [isStoreLoaded, setIsStoreLoaded] = createSignal(false);
  const [storeError, setStoreError] = createSignal<string>();

  const selectedEncounter = createMemo(() =>
    encounters().find((encounter) => encounter.id === selectedId())
  );

  createEffect(() => {
    const currentId = selectedId();
    const currentEncounters = encounters();

    if (currentId && currentEncounters.some((encounter) => encounter.id === currentId)) {
      return;
    }

    setSelectedId(currentEncounters[0]?.id);
  });

  createEffect(() => {
    if (!isStoreLoaded()) {
      return;
    }

    void saveInitiativeStore({
      schemaVersion: INITIATIVE_STORE_SCHEMA_VERSION,
      encounters: encounters(),
    }).catch((error: unknown) =>
      setStoreError(error instanceof Error ? error.message : "Nao foi possivel salvar iniciativa.")
    );
  });

  onMount(() => {
    void loadInitiativeStore()
      .then((store) => {
        setEncounters(store.encounters);
        setStoreError(undefined);
        setIsStoreLoaded(true);
      })
      .catch((error: unknown) =>
        setStoreError(
          error instanceof Error ? error.message : "Nao foi possivel carregar iniciativa."
        )
      );
  });

  const addEncounter = () => {
    const encounter = createEncounter();

    setEncounters((current) => [...current, encounter]);
    setSelectedId(encounter.id);
  };

  const updateEncounter = (updatedEncounter: InitiativeEncounterConfig) => {
    setEncounters((current) =>
      current.map((encounter) =>
        encounter.id === updatedEncounter.id ? updatedEncounter : encounter
      )
    );
  };

  const removeEncounter = (encounterId: string) => {
    setEncounters((current) => current.filter((encounter) => encounter.id !== encounterId));
  };

  const addParticipant = (encounter: InitiativeEncounterConfig) => {
    updateEncounter({
      ...encounter,
      participants: [...encounter.participants, createParticipant()],
    });
  };

  const updateParticipant = (
    encounter: InitiativeEncounterConfig,
    updatedParticipant: InitiativeParticipantConfig
  ) => {
    updateEncounter({
      ...encounter,
      participants: encounter.participants.map((participant) =>
        participant.id === updatedParticipant.id ? updatedParticipant : participant
      ),
    });
  };

  const removeParticipant = (encounter: InitiativeEncounterConfig, participantId: string) => {
    updateEncounter({
      ...encounter,
      participants: encounter.participants.filter(
        (participant) => participant.id !== participantId
      ),
    });
  };

  return (
    <EntityWorkspace
      title="Iniciativa"
      eyebrow="Encontros"
      addLabel="+ Encontro"
      items={encounters()}
      selectedId={selectedId()}
      emptyMessage="Crie encontros para vincular criaturas e jogadores as cenas."
      detailFallback="Selecione ou crie um encontro."
      getMeta={(encounter) => `${encounter.participants.length} participantes`}
      onAdd={addEncounter}
      onSelect={setSelectedId}
    >
      <Show when={selectedEncounter()}>
        {(encounter) => (
          <div class={styles.panel}>
            <Show when={storeError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h2>{encounter().name}</h2>
                  <p>Encontros podem ser vinculados a cenas pelo planejador de cenas.</p>
                </div>
                <button type="button" onClick={() => removeEncounter(encounter().id)}>
                  Remover
                </button>
              </div>

              <div class={styles.fields}>
                <label class={styles.field}>
                  <span>Nome</span>
                  <input
                    value={encounter().name}
                    onInput={(event) =>
                      updateEncounter({ ...encounter(), name: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={styles.field}>
                  <span>Descricao</span>
                  <input
                    value={encounter().description}
                    onInput={(event) =>
                      updateEncounter({ ...encounter(), description: event.currentTarget.value })
                    }
                  />
                </label>
              </div>
            </section>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h3>Participantes</h3>
                  <p>Cadastre jogadores, criaturas e NPCs para a cena.</p>
                </div>
                <button type="button" onClick={() => addParticipant(encounter())}>
                  + Participante
                </button>
              </div>

              <Show
                when={encounter().participants.length > 0}
                fallback={<p class={styles.status}>Nenhum participante neste encontro.</p>}
              >
                <div class={styles.rowList}>
                  <For each={encounter().participants}>
                    {(participant) => (
                      <div class={styles.row}>
                        <div class={styles.rowHeader}>
                          <div>
                            <strong>{participant.name}</strong>
                            <small>{participant.role}</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeParticipant(encounter(), participant.id)}
                          >
                            Remover
                          </button>
                        </div>

                        <div class={styles.fields}>
                          <label class={styles.field}>
                            <span>Nome</span>
                            <input
                              value={participant.name}
                              onInput={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  name: event.currentTarget.value,
                                })
                              }
                            />
                          </label>

                          <label class={styles.field}>
                            <span>Papel</span>
                            <select
                              value={participant.role}
                              onChange={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  role: event.currentTarget.value as InitiativeParticipantRole,
                                })
                              }
                            >
                              <For each={roles}>
                                {(role) => <option value={role.id}>{role.label}</option>}
                              </For>
                            </select>
                          </label>

                          <label class={styles.field}>
                            <span>Mod. iniciativa</span>
                            <input
                              type="number"
                              value={participant.initiativeModifier}
                              onInput={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  initiativeModifier: Math.round(
                                    Number(event.currentTarget.value) || 0
                                  ),
                                })
                              }
                            />
                          </label>

                          <label class={styles.field}>
                            <span>CA</span>
                            <input
                              type="number"
                              value={participant.armorClass ?? ""}
                              onInput={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  armorClass: parseOptionalInteger(event.currentTarget.value),
                                })
                              }
                            />
                          </label>

                          <label class={styles.field}>
                            <span>PV</span>
                            <input
                              type="number"
                              value={participant.hitPoints ?? ""}
                              onInput={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  hitPoints: parseOptionalInteger(event.currentTarget.value),
                                })
                              }
                            />
                          </label>

                          <label class={`${styles.field} ${styles.full}`}>
                            <span>Notas</span>
                            <input
                              value={participant.notes}
                              onInput={(event) =>
                                updateParticipant(encounter(), {
                                  ...participant,
                                  notes: event.currentTarget.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>
          </div>
        )}
      </Show>
    </EntityWorkspace>
  );
}
