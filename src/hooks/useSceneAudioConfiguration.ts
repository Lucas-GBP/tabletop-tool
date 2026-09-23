import { useCallback, useEffect, useState } from "react";
import type {
  AudioLibraryDto,
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
} from "@/api";
import { api } from "@/api";
import { applicationErrorMessage } from "@/lib";
import { useNotifications } from "./useNotifications";

interface SceneAudioState {
  library: AudioLibraryDto | null;
  scene: SceneAudioConfigurationDto | null;
  levels: SceneLevelAudioConfigurationDto[];
}

export function useSceneAudioConfiguration(scene: SceneDto) {
  const [state, setState] = useState<SceneAudioState>({
    library: null,
    scene: null,
    levels: [],
  });
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
      const [library, sceneConfiguration, ...levels] = await Promise.all([
        api.listAudioLibrary(),
        api.getSceneAudioConfiguration(scene.id),
        ...scene.levels.map((level) =>
          api.getSceneLevelAudioConfiguration(level.id),
        ),
      ]);
      setState({ library, scene: sceneConfiguration, levels });
      setLoaded(true);
    } catch (cause) {
      setLoaded(false);
      setLoadError(applicationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [scene.id, scene.levels]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function run<T>(success: string, action: () => Promise<T>) {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      notify(success);
      return result;
    } catch (cause) {
      setError(applicationErrorMessage(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    ...state,
    loading,
    loaded,
    loadError,
    reload: load,
    busy,
    error,
    async saveScene(configuration: SceneAudioConfigurationDto) {
      const updated = await run("Áudio da cena salvo.", () =>
        api.updateSceneAudioConfiguration(
          scene.id,
          configuration.audioObjectIds,
          configuration.audioListIds,
          configuration.audioCompositionIds,
        ),
      );
      if (!updated) return false;
      setState((current) => ({ ...current, scene: updated }));
      return true;
    },
    async saveLevel(configuration: SceneLevelAudioConfigurationDto) {
      const updated = await run("Áudio do nível salvo.", () =>
        api.updateSceneLevelAudioConfiguration(
          configuration.sceneLevelId,
          configuration.disabledLayerIds,
        ),
      );
      if (!updated) return false;
      setState((current) => ({
        ...current,
        levels: current.levels.map((level) =>
          level.sceneLevelId === updated.sceneLevelId ? updated : level,
        ),
      }));
      return true;
    },
  };
}
