import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import type { CoreSnapshotDto } from "@/api";
import { coreErrorMessage } from "@/lib";
import { useNotifications } from "./useNotifications";
import type { CampaignId, SceneId, SceneLevelId, SessionId } from "@/types";

const emptySnapshot: CoreSnapshotDto = { campaigns: [], scenes: [] };

type Mutation = () => Promise<CoreSnapshotDto>;

export function useCoreWorkspace() {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
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
      setSnapshot(await api.listCore());
      setLoaded(true);
    } catch (cause) {
      setLoaded(false);
      setLoadError(coreErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sceneNames = useMemo(
    () => new Map(snapshot.scenes.map((scene) => [scene.id, scene.name])),
    [snapshot.scenes],
  );

  async function mutate(success: string, action: Mutation) {
    setBusy(true);
    setError("");
    try {
      const updated = await action();
      setSnapshot(updated);
      notify(success);
      return updated;
    } catch (cause) {
      setError(coreErrorMessage(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const save = (success: string, action: Mutation) =>
    mutate(success, action).then(Boolean);

  return {
    snapshot,
    sceneNames,
    loading,
    loaded,
    loadError,
    reload: load,
    busy,
    error,
    createScene: async (name: string) => {
      const previousIds = new Set(snapshot.scenes.map((scene) => scene.id));
      const updated = await mutate("Cena criada.", () => api.createScene(name));
      return updated?.scenes.find((scene) => !previousIds.has(scene.id))?.id;
    },
    createCampaign: async (name: string) => {
      const previousIds = new Set(
        snapshot.campaigns.map((campaign) => campaign.id),
      );
      const updated = await mutate(
        "Campanha criada com sua sessão e cena iniciais.",
        () => api.createCampaign(name),
      );
      return updated?.campaigns.find(
        (campaign) => !previousIds.has(campaign.id),
      )?.id;
    },
    createSession: (campaignId: CampaignId, name: string, sceneId: SceneId) =>
      save("Sessão criada.", () =>
        api.createSession(campaignId, name, sceneId),
      ),
    createSceneLevel: (sceneId: SceneId, name: string) =>
      save("Nível adicionado.", () => api.createSceneLevel(sceneId, name)),
    renameCampaign: (campaignId: CampaignId, name: string) =>
      save("Campanha renomeada.", () => api.renameCampaign(campaignId, name)),
    renameSession: (sessionId: SessionId, name: string) =>
      save("Sessão renomeada.", () => api.renameSession(sessionId, name)),
    renameScene: (sceneId: SceneId, name: string) =>
      save("Cena renomeada.", () => api.renameScene(sceneId, name)),
    renameSceneLevel: (levelId: SceneLevelId, name: string) =>
      save("Nível renomeado.", () => api.renameSceneLevel(levelId, name)),
    moveSession: (sessionId: SessionId, position: number) =>
      save("Sessão reordenada.", () => api.moveSession(sessionId, position)),
    moveScene: (sessionId: SessionId, sceneId: SceneId, position: number) =>
      save("Cena reordenada.", () =>
        api.moveScene(sessionId, sceneId, position),
      ),
    moveSceneLevel: (levelId: SceneLevelId, position: number) =>
      save("Nível reordenado.", () => api.moveSceneLevel(levelId, position)),
    associateScene: (sessionId: SessionId, sceneId: SceneId) =>
      save("Cena adicionada à sessão.", () =>
        api.associateScene(sessionId, sceneId),
      ),
    deleteCampaign: (campaignId: CampaignId) =>
      save("Campanha excluída.", () => api.deleteCampaign(campaignId)),
    deleteSession: (sessionId: SessionId) =>
      save("Sessão excluída.", () => api.deleteSession(sessionId)),
    deleteScene: (sceneId: SceneId) =>
      save("Cena excluída.", () => api.deleteScene(sceneId)),
    deleteSceneLevel: (levelId: SceneLevelId) =>
      save("Nível excluído.", () => api.deleteSceneLevel(levelId)),
    removeSceneFromSession: (sessionId: SessionId, sceneId: SceneId) =>
      save("Cena removida da sessão.", () =>
        api.removeSceneFromSession(sessionId, sceneId),
      ),
  };
}

export type CoreWorkspace = ReturnType<typeof useCoreWorkspace>;
