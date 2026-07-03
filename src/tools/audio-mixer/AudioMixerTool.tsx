import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { normalizeAudioObjectConfig } from "./audio/audioRegions";
import { loadAvailableAudioFiles } from "./audio/audioLibrary";
import {
  emptyAudioMixerStore,
  loadAudioMixerStore,
  saveAudioMixerStore,
} from "./audio/audioMixerStore";
import { AudioManager } from "./audio/AudioManager";
import {
  AUDIO_MIXER_STORE_SCHEMA_VERSION,
  type AudioObjectConfig,
  type AudioObjectListConfig,
  type AvailableAudioFile,
} from "./audio/types";
import { AudioObjectListPanel } from "./components/AudioObjectListPanel";
import { AudioObjectPanel } from "./components/AudioObjectPanel";
import { AudioPickerModal, type AudioPickerTarget } from "./components/AudioPickerModal";
import styles from "./AudioMixerTool.module.scss";

const DEFAULT_AUDIO_OBJECT_VOLUME = 0.72;

function createId(prefix: string): string {
  return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function shouldEnableLoopByDefault(file: AvailableAudioFile): boolean {
  return file.category !== "effect";
}

function createAudioObjectFromFile(file: AvailableAudioFile): AudioObjectConfig {
  return normalizeAudioObjectConfig({
    id: createId("audio-object"),
    name: file.name,
    description: "",
    tags: [],
    filePath: file.path,
    defaultVolume: DEFAULT_AUDIO_OBJECT_VOLUME,
    fadeInMs: 1200,
    fadeOutMs: 1600,
    playableRegion: {
      startSeconds: 0,
      endSeconds: null,
    },
    loopRegion: {
      enabled: shouldEnableLoopByDefault(file),
      startSeconds: 0,
      endSeconds: null,
    },
  });
}

function createAudioList(): AudioObjectListConfig {
  return {
    id: createId("audio-list"),
    name: "Nova lista",
    description: "",
    audioObjectIds: [],
  };
}

function hasAudioObjectPlaybackChange(
  currentObject: AudioObjectConfig,
  updatedObject: AudioObjectConfig
): boolean {
  return (
    currentObject.filePath !== updatedObject.filePath ||
    currentObject.defaultVolume !== updatedObject.defaultVolume ||
    JSON.stringify(currentObject.playableRegion) !== JSON.stringify(updatedObject.playableRegion) ||
    JSON.stringify(currentObject.loopRegion) !== JSON.stringify(updatedObject.loopRegion)
  );
}

export function AudioMixerTool() {
  const audioManager = new AudioManager();
  const initialStore = emptyAudioMixerStore();
  const [audioObjects, setAudioObjects] = createSignal<AudioObjectConfig[]>(
    initialStore.audioObjects
  );
  const [audioLists, setAudioLists] = createSignal<AudioObjectListConfig[]>(
    initialStore.audioObjectLists
  );
  const [previewVolume, setPreviewVolume] = createSignal(0.82);
  const [availableAudioFiles, setAvailableAudioFiles] = createSignal<AvailableAudioFile[]>([]);
  const [isStoreLoaded, setIsStoreLoaded] = createSignal(false);
  const [isLibraryLoading, setIsLibraryLoading] = createSignal(false);
  const [libraryError, setLibraryError] = createSignal<string>();
  const [storeError, setStoreError] = createSignal<string>();
  const [audioError, setAudioError] = createSignal<string>();
  const [pickerTarget, setPickerTarget] = createSignal<AudioPickerTarget>();
  const [previewedAudioObjectId, setPreviewedAudioObjectId] = createSignal<string>();
  const [previewedAudioListId, setPreviewedAudioListId] = createSignal<string>();
  const [previewedAudioTime, setPreviewedAudioTime] = createSignal<number>();

  const getAudioObject = (audioObjectId: string) =>
    audioObjects().find((audioObject) => audioObject.id === audioObjectId);
  const getAudioList = (audioListId: string) =>
    audioLists().find((audioList) => audioList.id === audioListId);

  createEffect(() => {
    if (!isStoreLoaded()) {
      return;
    }

    const nextStore = {
      schemaVersion: AUDIO_MIXER_STORE_SCHEMA_VERSION,
      audioObjects: audioObjects().map((audioObject) => normalizeAudioObjectConfig(audioObject)),
      audioObjectLists: audioLists(),
    } as const;

    void saveAudioMixerStore(nextStore).catch((error: unknown) => {
      setStoreError(
        error instanceof Error ? error.message : "Nao foi possivel salvar a biblioteca de audio."
      );
    });
  });

  const refreshAudioLibrary = async () => {
    setIsLibraryLoading(true);
    setLibraryError(undefined);

    try {
      setAvailableAudioFiles(await loadAvailableAudioFiles());
    } catch (error) {
      setLibraryError(
        error instanceof Error ? error.message : "Nao foi possivel carregar os audios."
      );
    } finally {
      setIsLibraryLoading(false);
    }
  };

  onMount(() => {
    void refreshAudioLibrary();
    void loadAudioMixerStore()
      .then((store) => {
        setAudioObjects(
          store.audioObjects.map((audioObject) => normalizeAudioObjectConfig(audioObject))
        );
        setAudioLists(store.audioObjectLists);
        setStoreError(undefined);
        setIsStoreLoaded(true);
      })
      .catch((error: unknown) => {
        setStoreError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar a biblioteca de audio."
        );
      });
  });

  onCleanup(() => {
    audioManager.stopPreview();
  });

  const stopAudioObjectPreview = () => {
    audioManager.stopPreview();
    setPreviewedAudioObjectId(undefined);
    setPreviewedAudioListId(undefined);
    setPreviewedAudioTime(undefined);
  };

  const startAudioObjectPreview = async (audioObject: AudioObjectConfig, audioListId?: string) => {
    stopAudioObjectPreview();
    await audioManager.init();
    await audioManager.previewAudioObject(audioObject, {
      volume: audioObject.defaultVolume * previewVolume(),
      onEnded: () => {
        setPreviewedAudioObjectId((currentId) =>
          currentId === audioObject.id ? undefined : currentId
        );
        setPreviewedAudioListId((currentId) => (currentId === audioListId ? undefined : currentId));
        setPreviewedAudioTime(undefined);
      },
      onTimeUpdate: (seconds) => setPreviewedAudioTime(seconds),
    });
    setPreviewedAudioObjectId(audioObject.id);
    setPreviewedAudioListId(audioListId);
  };

  const toggleAudioObjectPreview = async (audioObject: AudioObjectConfig) => {
    setAudioError(undefined);

    if (previewedAudioObjectId() === audioObject.id && !previewedAudioListId()) {
      stopAudioObjectPreview();
      return;
    }

    try {
      await startAudioObjectPreview(audioObject);
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Nao foi possivel testar o objeto de audio."
      );
      setPreviewedAudioObjectId(undefined);
      setPreviewedAudioTime(undefined);
    }
  };

  const toggleAudioListPreview = async (audioList: AudioObjectListConfig) => {
    setAudioError(undefined);

    if (previewedAudioListId() === audioList.id) {
      stopAudioObjectPreview();
      return;
    }

    const candidates = audioList.audioObjectIds
      .map((objectId) => getAudioObject(objectId))
      .filter((audioObject): audioObject is AudioObjectConfig => Boolean(audioObject));
    const selectedObject = candidates[Math.floor(Math.random() * candidates.length)];

    if (!selectedObject) {
      setAudioError("A lista precisa ter pelo menos um objeto de audio valido para ser testada.");
      return;
    }

    try {
      await startAudioObjectPreview(selectedObject, audioList.id);
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Nao foi possivel testar a lista de audio."
      );
      setPreviewedAudioObjectId(undefined);
      setPreviewedAudioListId(undefined);
      setPreviewedAudioTime(undefined);
    }
  };

  const seekAudioPreview = (seconds: number) => {
    const seekedSeconds = audioManager.seekPreview(seconds);

    if (typeof seekedSeconds === "number") {
      setPreviewedAudioTime(seekedSeconds);
    }
  };

  const addAudioObject = (file: AvailableAudioFile) => {
    setAudioObjects((currentObjects) => [...currentObjects, createAudioObjectFromFile(file)]);
  };

  const updateAudioObject = (updatedObject: AudioObjectConfig) => {
    const normalizedObject = normalizeAudioObjectConfig(updatedObject);
    const currentObject = getAudioObject(normalizedObject.id);

    if (
      currentObject &&
      previewedAudioObjectId() === normalizedObject.id &&
      hasAudioObjectPlaybackChange(currentObject, normalizedObject)
    ) {
      stopAudioObjectPreview();
    }

    setAudioObjects((currentObjects) =>
      currentObjects.map((audioObject) =>
        audioObject.id === normalizedObject.id ? normalizedObject : audioObject
      )
    );
  };

  const removeAudioObject = (objectId: string) => {
    if (previewedAudioObjectId() === objectId) {
      stopAudioObjectPreview();
    }

    setAudioLists((currentLists) =>
      currentLists.map((audioList) => ({
        ...audioList,
        audioObjectIds: audioList.audioObjectIds.filter((item) => item !== objectId),
      }))
    );
    setAudioObjects((currentObjects) =>
      currentObjects.filter((audioObject) => audioObject.id !== objectId)
    );
  };

  const replaceAudioObjectFile = (objectId: string, file: AvailableAudioFile) => {
    const audioObject = getAudioObject(objectId);

    if (!audioObject) {
      return;
    }

    updateAudioObject({
      ...audioObject,
      filePath: file.path,
    });
  };

  const addAudioList = () => {
    setAudioLists((currentLists) => [...currentLists, createAudioList()]);
  };

  const updateAudioList = (updatedList: AudioObjectListConfig) => {
    const currentList = getAudioList(updatedList.id);

    if (
      currentList &&
      previewedAudioListId() === updatedList.id &&
      currentList.audioObjectIds.join("|") !== updatedList.audioObjectIds.join("|")
    ) {
      stopAudioObjectPreview();
    }

    setAudioLists((currentLists) =>
      currentLists.map((audioList) => (audioList.id === updatedList.id ? updatedList : audioList))
    );
  };

  const removeAudioList = (audioListId: string) => {
    if (previewedAudioListId() === audioListId) {
      stopAudioObjectPreview();
    }

    setAudioLists((currentLists) =>
      currentLists.filter((audioList) => audioList.id !== audioListId)
    );
  };

  const selectAudioFromPicker = (file: AvailableAudioFile) => {
    const target = pickerTarget();

    if (!target) {
      return;
    }

    switch (target.kind) {
      case "add-object":
        addAudioObject(file);
        break;
      case "replace-object":
        replaceAudioObjectFile(target.objectId, file);
        break;
    }

    setPickerTarget(undefined);
  };

  return (
    <section class={styles.root}>
      <header class={styles.header}>
        <div>
          <span class={styles.eyebrow}>Biblioteca de audio</span>
          <h1>Mixer de audio</h1>
        </div>

        <label class={styles.previewControl}>
          <span>Previa</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={previewVolume()}
            onInput={(event) => setPreviewVolume(Number(event.currentTarget.value))}
          />
          <strong>{Math.round(previewVolume() * 100)}%</strong>
        </label>
      </header>

      {audioError() && <p class={styles.error}>{audioError()}</p>}
      {storeError() && <p class={styles.error}>{storeError()}</p>}

      <AudioObjectPanel
        objects={audioObjects()}
        availableAudioFiles={availableAudioFiles()}
        onAdd={() => setPickerTarget({ kind: "add-object" })}
        onPickFile={(objectId) =>
          setPickerTarget({
            kind: "replace-object",
            objectId,
          })
        }
        onChange={updateAudioObject}
        previewingObjectId={previewedAudioObjectId()}
        previewTime={previewedAudioTime()}
        onPreview={(audioObject) => void toggleAudioObjectPreview(audioObject)}
        onSeekPreview={seekAudioPreview}
        onRemove={removeAudioObject}
      />

      <AudioObjectListPanel
        lists={audioLists()}
        objects={audioObjects()}
        onAdd={addAudioList}
        onChange={updateAudioList}
        previewingListId={previewedAudioListId()}
        onPreview={(audioList) => void toggleAudioListPreview(audioList)}
        onRemove={removeAudioList}
      />

      {pickerTarget() && (
        <AudioPickerModal
          files={availableAudioFiles()}
          target={pickerTarget() as AudioPickerTarget}
          isLoading={isLibraryLoading()}
          error={libraryError()}
          onRefresh={refreshAudioLibrary}
          onClose={() => setPickerTarget(undefined)}
          onSelect={selectAudioFromPicker}
        />
      )}
    </section>
  );
}
