import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import type {
  AudioCompositionInputDto,
  AudioLibraryDto,
  AudioListInputDto,
  AudioObjectInputDto,
} from "@/api";
import { applicationErrorMessage } from "@/lib";
import { useNotifications } from "./useNotifications";
import type { AudioCompositionId, AudioListId, AudioObjectId } from "@/types";

const emptyLibrary: AudioLibraryDto = {
  assetDirectory: null,
  files: [],
  scanWarnings: [],
  objects: [],
  lists: [],
  compositions: [],
  settings: { masterVolumeDb: 0 },
};

type Mutation = () => Promise<AudioLibraryDto>;

export function useAudioWorkspace() {
  const [library, setLibrary] = useState(emptyLibrary);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLibrary(await api.listAudioLibrary());
      setLoaded(true);
    } catch (cause) {
      setLoaded(false);
      setLoadError(applicationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(
    success: string,
    action: Mutation,
    preserveDiscovery = true,
  ) {
    setBusy(true);
    setError("");
    try {
      const updated = await action();
      setLibrary((current) => ({
        ...updated,
        assetDirectory: updated.assetDirectory ?? current.assetDirectory,
        files:
          preserveDiscovery &&
          updated.files.length === 0 &&
          current.files.length > 0
            ? current.files
            : updated.files,
        scanWarnings: preserveDiscovery
          ? current.scanWarnings
          : updated.scanWarnings,
      }));
      notify(success);
      return updated;
    } catch (cause) {
      setError(applicationErrorMessage(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const save = (success: string, action: Mutation) =>
    mutate(success, action).then(Boolean);

  return {
    library,
    loading,
    loaded,
    loadError,
    reload: load,
    busy,
    error,
    rescanFiles: () =>
      mutate("Diretório verificado.", api.listAudioLibrary, false).then(
        Boolean,
      ),
    createAudioObject: async (input: AudioObjectInputDto) => {
      const previous = new Set(library.objects.map((object) => object.id));
      const updated = await mutate("Objeto de áudio criado.", () =>
        api.createAudioObject(input),
      );
      return updated?.objects.find((object) => !previous.has(object.id))?.id;
    },
    updateAudioObject: (id: AudioObjectId, input: AudioObjectInputDto) =>
      save("Objeto de áudio salvo.", () => api.updateAudioObject(id, input)),
    deleteAudioObject: (id: AudioObjectId) =>
      save("Objeto de áudio excluído.", () => api.deleteAudioObject(id)),
    createAudioList: (input: AudioListInputDto) =>
      save("Lista de áudio criada.", () => api.createAudioList(input)),
    updateAudioList: (id: AudioListId, input: AudioListInputDto) =>
      save("Lista de áudio salva.", () => api.updateAudioList(id, input)),
    deleteAudioList: (id: AudioListId) =>
      save("Lista de áudio excluída.", () => api.deleteAudioList(id)),
    createAudioComposition: (input: AudioCompositionInputDto) =>
      save("Composição criada.", () => api.createAudioComposition(input)),
    updateAudioComposition: (
      id: AudioCompositionId,
      input: AudioCompositionInputDto,
    ) => save("Composição salva.", () => api.updateAudioComposition(id, input)),
    deleteAudioComposition: (id: AudioCompositionId) =>
      save("Composição excluída.", () => api.deleteAudioComposition(id)),
    updateMasterVolume: (masterVolumeDb: number) =>
      save("Volume geral salvo.", () =>
        api.updateAudioMixerSettings(masterVolumeDb),
      ),
  };
}
