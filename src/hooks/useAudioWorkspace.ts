import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import type {
  AudioCompositionInputDto,
  AudioLibraryDto,
  AudioListInputDto,
  AudioObjectInputDto,
} from "@/api";
import { applicationErrorMessage } from "@/lib";

const emptyLibrary: AudioLibraryDto = {
  assetDirectory: null,
  files: [],
  objects: [],
  lists: [],
  compositions: [],
  settings: { masterVolumeDb: 0 },
};

type Mutation = () => Promise<AudioLibraryDto>;

export function useAudioWorkspace() {
  const [library, setLibrary] = useState(emptyLibrary);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLibrary(await api.listAudioLibrary());
    } catch (cause) {
      setError(applicationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(success: string, action: Mutation) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await action();
      setLibrary((current) => ({
        ...updated,
        assetDirectory: updated.assetDirectory ?? current.assetDirectory,
        files:
          updated.files.length === 0 && current.files.length > 0
            ? current.files
            : updated.files,
      }));
      setNotice(success);
      return updated;
    } catch (cause) {
      setError(applicationErrorMessage(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    library,
    loading,
    busy,
    error,
    notice,
    reload: load,
    clearFeedback() {
      setError("");
      setNotice("");
    },
    rescanFiles: () =>
      mutate("Diretório verificado.", api.listAudioLibrary).then(Boolean),
    createAudioObject: async (input: AudioObjectInputDto) => {
      const previous = new Set(library.objects.map((object) => object.id));
      const updated = await mutate("Objeto de áudio criado.", () =>
        api.createAudioObject(input),
      );
      return updated?.objects.find((object) => !previous.has(object.id))?.id;
    },
    updateAudioObject: (id: string, input: AudioObjectInputDto) =>
      mutate("Objeto de áudio salvo.", () =>
        api.updateAudioObject(id, input),
      ).then(Boolean),
    deleteAudioObject: (id: string) =>
      mutate("Objeto de áudio excluído.", () => api.deleteAudioObject(id)).then(
        Boolean,
      ),
    createAudioList: (input: AudioListInputDto) =>
      mutate("Lista de áudio criada.", () => api.createAudioList(input)).then(
        Boolean,
      ),
    updateAudioList: (id: string, input: AudioListInputDto) =>
      mutate("Lista de áudio salva.", () =>
        api.updateAudioList(id, input),
      ).then(Boolean),
    deleteAudioList: (id: string) =>
      mutate("Lista de áudio excluída.", () => api.deleteAudioList(id)).then(
        Boolean,
      ),
    createAudioComposition: (input: AudioCompositionInputDto) =>
      mutate("Composição criada.", () =>
        api.createAudioComposition(input),
      ).then(Boolean),
    updateAudioComposition: (id: string, input: AudioCompositionInputDto) =>
      mutate("Composição salva.", () =>
        api.updateAudioComposition(id, input),
      ).then(Boolean),
    deleteAudioComposition: (id: string) =>
      mutate("Composição excluída.", () => api.deleteAudioComposition(id)).then(
        Boolean,
      ),
    updateMasterVolume: (masterVolumeDb: number) =>
      mutate("Volume geral salvo.", () =>
        api.updateAudioMixerSettings(masterVolumeDb),
      ).then(Boolean),
  };
}

export type AudioWorkspace = ReturnType<typeof useAudioWorkspace>;
