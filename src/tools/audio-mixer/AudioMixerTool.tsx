import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { loadAvailableAudioFiles } from "./audio/audioLibrary";
import { AudioManager } from "./audio/AudioManager";
import type { AudioObjectConfig, AudioObjectListConfig, AvailableAudioFile } from "./audio/types";
import { AudioObjectListPanel } from "./components/AudioObjectListPanel";
import { AudioObjectPanel } from "./components/AudioObjectPanel";
import { AudioPickerModal, type AudioPickerTarget } from "./components/AudioPickerModal";
import styles from "./AudioMixerTool.module.scss";

const AUDIO_OBJECTS_STORAGE_KEY = "tabletop-tool.audio-mixer.audio-objects.v1";
const AUDIO_LISTS_STORAGE_KEY = "tabletop-tool.audio-mixer.audio-lists.v1";
const DEFAULT_AUDIO_OBJECT_VOLUME = 0.72;

function createId(prefix: string): string {
  return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function shouldEnableLoopByDefault(file: AvailableAudioFile): boolean {
  return file.category !== "effect";
}

function createAudioObjectFromFile(file: AvailableAudioFile): AudioObjectConfig {
  return {
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
    },
    loopRegion: {
      enabled: shouldEnableLoopByDefault(file),
      startSeconds: 0,
    },
  };
}

function createAudioList(): AudioObjectListConfig {
  return {
    id: createId("audio-list"),
    name: "Nova lista",
    description: "",
    audioObjectIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberOrUndefined(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function normalizeAudioObject(value: unknown): AudioObjectConfig | undefined {
  if (!isRecord(value) || !isRecord(value.playableRegion) || !isRecord(value.loopRegion)) {
    return undefined;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.filePath !== "string" ||
    typeof value.defaultVolume !== "number" ||
    typeof value.playableRegion.startSeconds !== "number" ||
    !isNumberOrUndefined(value.playableRegion.endSeconds) ||
    typeof value.loopRegion.enabled !== "boolean" ||
    typeof value.loopRegion.startSeconds !== "number" ||
    !isNumberOrUndefined(value.loopRegion.endSeconds)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    filePath: value.filePath,
    defaultVolume: value.defaultVolume,
    fadeInMs: typeof value.fadeInMs === "number" ? value.fadeInMs : 1200,
    fadeOutMs: typeof value.fadeOutMs === "number" ? value.fadeOutMs : 1600,
    playableRegion: {
      startSeconds: value.playableRegion.startSeconds,
      endSeconds: value.playableRegion.endSeconds,
    },
    loopRegion: {
      enabled: value.loopRegion.enabled,
      startSeconds: value.loopRegion.startSeconds,
      endSeconds: value.loopRegion.endSeconds,
    },
  };
}

function normalizeAudioList(value: unknown): AudioObjectListConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.audioObjectIds)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    audioObjectIds: value.audioObjectIds.filter(
      (audioObjectId): audioObjectId is string => typeof audioObjectId === "string"
    ),
  };
}

function loadStoredAudioObjects(): AudioObjectConfig[] {
  try {
    const storedObjects = localStorage.getItem(AUDIO_OBJECTS_STORAGE_KEY);

    if (!storedObjects) {
      return [];
    }

    const parsedObjects: unknown = JSON.parse(storedObjects);

    return Array.isArray(parsedObjects)
      ? parsedObjects
          .map((audioObject) => normalizeAudioObject(audioObject))
          .filter((audioObject): audioObject is AudioObjectConfig => Boolean(audioObject))
      : [];
  } catch {
    return [];
  }
}

function loadStoredAudioLists(): AudioObjectListConfig[] {
  try {
    const storedLists = localStorage.getItem(AUDIO_LISTS_STORAGE_KEY);

    if (!storedLists) {
      return [];
    }

    const parsedLists: unknown = JSON.parse(storedLists);

    return Array.isArray(parsedLists)
      ? parsedLists
          .map((audioList) => normalizeAudioList(audioList))
          .filter((audioList): audioList is AudioObjectListConfig => Boolean(audioList))
      : [];
  } catch {
    return [];
  }
}

function storeAudioObjects(objects: AudioObjectConfig[]): void {
  localStorage.setItem(AUDIO_OBJECTS_STORAGE_KEY, JSON.stringify(objects));
}

function storeAudioLists(lists: AudioObjectListConfig[]): void {
  localStorage.setItem(AUDIO_LISTS_STORAGE_KEY, JSON.stringify(lists));
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
  const [audioObjects, setAudioObjects] =
    createSignal<AudioObjectConfig[]>(loadStoredAudioObjects());
  const [audioLists, setAudioLists] = createSignal<AudioObjectListConfig[]>(loadStoredAudioLists());
  const [previewVolume, setPreviewVolume] = createSignal(0.82);
  const [availableAudioFiles, setAvailableAudioFiles] = createSignal<AvailableAudioFile[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = createSignal(false);
  const [libraryError, setLibraryError] = createSignal<string>();
  const [audioError, setAudioError] = createSignal<string>();
  const [pickerTarget, setPickerTarget] = createSignal<AudioPickerTarget>();
  const [previewedAudioObjectId, setPreviewedAudioObjectId] = createSignal<string>();
  const [previewedAudioTime, setPreviewedAudioTime] = createSignal<number>();

  const getAudioObject = (audioObjectId: string) =>
    audioObjects().find((audioObject) => audioObject.id === audioObjectId);

  createEffect(() => {
    storeAudioObjects(audioObjects());
  });

  createEffect(() => {
    storeAudioLists(audioLists());
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
  });

  onCleanup(() => {
    audioManager.stopPreview();
  });

  const stopAudioObjectPreview = () => {
    audioManager.stopPreview();
    setPreviewedAudioObjectId(undefined);
    setPreviewedAudioTime(undefined);
  };

  const toggleAudioObjectPreview = async (audioObject: AudioObjectConfig) => {
    setAudioError(undefined);

    if (previewedAudioObjectId() === audioObject.id) {
      stopAudioObjectPreview();
      return;
    }

    try {
      stopAudioObjectPreview();
      await audioManager.init();
      await audioManager.previewAudioObject(audioObject, {
        volume: audioObject.defaultVolume * previewVolume(),
        onEnded: () => {
          setPreviewedAudioObjectId((currentId) =>
            currentId === audioObject.id ? undefined : currentId
          );
          setPreviewedAudioTime(undefined);
        },
        onTimeUpdate: (seconds) => setPreviewedAudioTime(seconds),
      });
      setPreviewedAudioObjectId(audioObject.id);
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Nao foi possivel testar o objeto de audio."
      );
      setPreviewedAudioObjectId(undefined);
      setPreviewedAudioTime(undefined);
    }
  };

  const addAudioObject = (file: AvailableAudioFile) => {
    setAudioObjects((currentObjects) => [...currentObjects, createAudioObjectFromFile(file)]);
  };

  const updateAudioObject = (updatedObject: AudioObjectConfig) => {
    const currentObject = getAudioObject(updatedObject.id);

    if (
      currentObject &&
      previewedAudioObjectId() === updatedObject.id &&
      hasAudioObjectPlaybackChange(currentObject, updatedObject)
    ) {
      stopAudioObjectPreview();
    }

    setAudioObjects((currentObjects) =>
      currentObjects.map((audioObject) =>
        audioObject.id === updatedObject.id ? updatedObject : audioObject
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
    setAudioLists((currentLists) =>
      currentLists.map((audioList) => (audioList.id === updatedList.id ? updatedList : audioList))
    );
  };

  const removeAudioList = (audioListId: string) => {
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
        onRemove={removeAudioObject}
      />

      <AudioObjectListPanel
        lists={audioLists()}
        objects={audioObjects()}
        onAdd={addAudioList}
        onChange={updateAudioList}
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
