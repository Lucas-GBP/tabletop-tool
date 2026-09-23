import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AudioLibraryDto,
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
  SessionDto,
} from "@/api";
import { api } from "@/api";
import { normalizeRuntimeError, RuntimeError } from "@/runtime";
import { AudioMixer, SceneAudioRuntime } from "@/tools/audio-mixer";
import type {
  AudioCueReference,
  PlaybackInfo,
  SceneAudioRuntimeSnapshot,
} from "@/tools/audio-mixer";

interface LoadedAudio {
  library: AudioLibraryDto;
  scenes: Map<string, SceneAudioConfigurationDto>;
  levels: Map<string, SceneLevelAudioConfigurationDto>;
}

export function useSessionAudioRuntime(
  session: SessionDto,
  scenes: readonly SceneDto[],
  currentSceneId: string | undefined,
  currentLevelId: string | undefined,
) {
  const [loaded, setLoaded] = useState<LoadedAudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SceneAudioRuntimeSnapshot | null>(
    null,
  );
  const [playbacks, setPlaybacks] = useState<readonly PlaybackInfo[]>([]);
  const [error, setError] = useState<RuntimeError | null>(null);
  const [diagnostics, setDiagnostics] = useState<RuntimeError[]>([]);
  const [started, setStarted] = useState(false);
  const mixerRef = useRef<AudioMixer | null>(null);
  const sceneRuntimeRef = useRef<SceneAudioRuntime | null>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const sceneIds = useMemo(
    () => session.scenes.map((association) => association.sceneId),
    [session.scenes],
  );
  const definitionIdentity = sceneIds.join(":");

  const report = useCallback(
    (
      cause: unknown,
      fallback: ConstructorParameters<typeof RuntimeError>[0],
    ) => {
      const runtimeError = normalizeRuntimeError(cause, fallback);
      if (!mountedRef.current) return runtimeError;
      setError(runtimeError);
      setDiagnostics((current) => [...current.slice(-19), runtimeError]);
      return runtimeError;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    window.queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    const sessionScenes = scenes.filter((scene) => sceneIds.includes(scene.id));
    void Promise.all([
      api.listAudioLibrary(),
      ...sessionScenes.map((scene) => api.getSceneAudioConfiguration(scene.id)),
      ...sessionScenes.flatMap((scene) =>
        scene.levels.map((level) =>
          api.getSceneLevelAudioConfiguration(level.id),
        ),
      ),
    ])
      .then((values) => {
        if (cancelled) return;
        const library = values[0];
        const sceneCount = sessionScenes.length;
        const sceneConfigurations = values.slice(
          1,
          1 + sceneCount,
        ) as SceneAudioConfigurationDto[];
        const levelConfigurations = values.slice(
          1 + sceneCount,
        ) as SceneLevelAudioConfigurationDto[];
        setLoaded({
          library,
          scenes: new Map(
            sceneConfigurations.map((item) => [item.sceneId, item]),
          ),
          levels: new Map(
            levelConfigurations.map((item) => [item.sceneLevelId, item]),
          ),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        report(cause, {
          code: "AUDIO_CONFIGURATION_LOAD_FAILED",
          message: "Não foi possível carregar o áudio desta sessão.",
          operation: "load_session_audio",
          entityId: session.id,
          recoverable: true,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id, definitionIdentity, sceneIds, scenes, report]);

  useEffect(() => {
    if (!loaded || !currentSceneId || !currentLevelId) return;
    let mixer = mixerRef.current;
    if (!mixer) {
      mixer = new AudioMixer({
        definitions: loaded.library,
        masterVolumeDb: loaded.library.settings.masterVolumeDb,
        resolveFilePath: api.resolveAssetPath,
      });
      mixerRef.current = mixer;
    }

    let sceneRuntime = sceneRuntimeRef.current;
    if (sceneRuntime?.sceneId !== currentSceneId) {
      sceneRuntime?.dispose();
      const sceneConfiguration = loaded.scenes.get(currentSceneId);
      const scene = scenes.find((candidate) => candidate.id === currentSceneId);
      if (!sceneConfiguration || !scene) {
        report(new Error("Missing scene audio definition."), {
          code: "AUDIO_SCENE_CONFIGURATION_NOT_FOUND",
          message: "A configuração de áudio da cena não está disponível.",
          operation: "enter_scene_audio",
          entityId: currentSceneId,
          recoverable: true,
        });
        sceneRuntimeRef.current = null;
        window.queueMicrotask(() => {
          if (mountedRef.current) setSnapshot(null);
        });
        return;
      }
      sceneRuntime = new SceneAudioRuntime({
        definition: {
          scene: sceneConfiguration,
          levels: scene.levels.map(
            (level) =>
              loaded.levels.get(level.id) ?? {
                sceneLevelId: level.id,
                disabledLayerIds: [],
              },
          ),
          definitions: loaded.library,
        },
        mixer,
        onError: (runtimeError) =>
          report(runtimeError, {
            code: "SCENE_AUDIO_FAILED",
            message: "Uma operação de áudio da cena falhou.",
            operation: "run_scene_audio",
            entityId: currentSceneId,
            recoverable: true,
          }),
      });
      sceneRuntimeRef.current = sceneRuntime;
      if (startedRef.current) sceneRuntime.start(currentLevelId);
      else sceneRuntime.switchLevel(currentLevelId);
    } else if (sceneRuntime.snapshot.currentLevelId !== currentLevelId) {
      try {
        sceneRuntime.switchLevel(currentLevelId);
      } catch (cause) {
        report(cause, {
          code: "AUDIO_LEVEL_SWITCH_FAILED",
          message: "O áudio não acompanhou a troca de nível.",
          operation: "switch_scene_audio_level",
          entityId: currentLevelId,
          recoverable: true,
        });
      }
    }
    const nextSnapshot = sceneRuntime.snapshot;
    window.queueMicrotask(() => {
      if (mountedRef.current) setSnapshot(nextSnapshot);
    });
  }, [loaded, currentSceneId, currentLevelId, scenes, report]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const mixer = mixerRef.current;
      const sceneRuntime = sceneRuntimeRef.current;
      if (mixer) setPlaybacks(mixer.activePlaybacks);
      if (sceneRuntime) setSnapshot(sceneRuntime.snapshot);
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sceneRuntimeRef.current?.dispose();
      mixerRef.current?.dispose();
      sceneRuntimeRef.current = null;
      mixerRef.current = null;
      startedRef.current = false;
    };
  }, []);

  function execute(
    operation: string,
    entityId: string,
    action: (sceneRuntime: SceneAudioRuntime, mixer: AudioMixer) => void,
  ) {
    const sceneRuntime = sceneRuntimeRef.current;
    const mixer = mixerRef.current;
    if (!sceneRuntime || !mixer) return false;
    try {
      action(sceneRuntime, mixer);
      setSnapshot(sceneRuntime.snapshot);
      setPlaybacks(mixer.activePlaybacks);
      setError(null);
      return true;
    } catch (cause) {
      report(cause, {
        code: "AUDIO_RUNTIME_OPERATION_FAILED",
        message: "A operação de áudio falhou.",
        operation,
        entityId,
        recoverable: true,
      });
      return false;
    }
  }

  async function activate() {
    const mixer = mixerRef.current;
    const sceneRuntime = sceneRuntimeRef.current;
    if (!mixer || !sceneRuntime || !currentLevelId) return false;
    try {
      await mixer.activate();
      if (!startedRef.current) {
        startedRef.current = true;
        setStarted(true);
        sceneRuntime.start(currentLevelId);
      }
      setSnapshot(sceneRuntime.snapshot);
      setError(null);
      return true;
    } catch (cause) {
      report(cause, {
        code: "AUDIO_ACTIVATION_FAILED",
        message: "Não foi possível ativar o áudio.",
        operation: "activate_session_audio",
        entityId: session.id,
        recoverable: true,
      });
      return false;
    }
  }

  async function playCue(cue: AudioCueReference) {
    if (!startedRef.current && !(await activate())) return false;
    const sceneRuntime = sceneRuntimeRef.current;
    if (!sceneRuntime) return false;
    try {
      await sceneRuntime.playCue(cue);
      setPlaybacks(mixerRef.current?.activePlaybacks ?? []);
      return true;
    } catch {
      return false;
    }
  }

  return {
    library: loaded?.library ?? null,
    loading,
    snapshot,
    playbacks,
    error,
    diagnostics,
    started,
    activate,
    playCue,
    setLayerOverride: (layerId: string, enabled: boolean | null) =>
      execute("set_audio_layer_override", layerId, (sceneRuntime) =>
        sceneRuntime.setLayerOverride(layerId, enabled),
      ),
    pause: (id: string) =>
      execute("pause_playback", id, (_sceneRuntime, mixer) => mixer.pause(id)),
    resume: (id: string) =>
      execute("resume_playback", id, (_sceneRuntime, mixer) =>
        mixer.resume(id),
      ),
    stop: (id: string) =>
      execute("stop_playback", id, (_sceneRuntime, mixer) => mixer.stop(id)),
    finish: (id: string) =>
      execute("finish_playback", id, (_sceneRuntime, mixer) =>
        mixer.finish(id),
      ),
    pauseAll: () =>
      execute("pause_all_audio", session.id, (_sceneRuntime, mixer) =>
        mixer.pauseAll(),
      ),
    resumeAll: () =>
      execute("resume_all_audio", session.id, (_sceneRuntime, mixer) =>
        mixer.resumeAll(),
      ),
    stopAll: () =>
      execute("stop_all_audio", session.id, (_sceneRuntime, mixer) =>
        mixer.stopAll(),
      ),
  };
}

export type SessionAudioRuntimeController = ReturnType<
  typeof useSessionAudioRuntime
>;
