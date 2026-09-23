import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import type { CoreSnapshotDto } from "@/api";
import { coreErrorMessage } from "@/lib";

const emptySnapshot: CoreSnapshotDto = { campaigns: [], scenes: [] };

type Mutation = () => Promise<CoreSnapshotDto>;

export function useCoreWorkspace() {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void api
      .listCore()
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(coreErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const sceneNames = useMemo(
    () => new Map(snapshot.scenes.map((scene) => [scene.id, scene.name])),
    [snapshot.scenes],
  );

  async function mutate(success: string, action: Mutation) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await action();
      setSnapshot(updated);
      setNotice(success);
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
    busy,
    error,
    notice,
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
    createSession: (campaignId: string, name: string, sceneId: string) =>
      save("Sessão criada.", () =>
        api.createSession(campaignId, name, sceneId),
      ),
    createSceneLevel: (sceneId: string, name: string) =>
      save("Nível adicionado.", () => api.createSceneLevel(sceneId, name)),
    renameCampaign: (campaignId: string, name: string) =>
      save("Campanha renomeada.", () => api.renameCampaign(campaignId, name)),
    renameSession: (sessionId: string, name: string) =>
      save("Sessão renomeada.", () => api.renameSession(sessionId, name)),
    renameScene: (sceneId: string, name: string) =>
      save("Cena renomeada.", () => api.renameScene(sceneId, name)),
    renameSceneLevel: (levelId: string, name: string) =>
      save("Nível renomeado.", () => api.renameSceneLevel(levelId, name)),
    associateScene: (sessionId: string, sceneId: string) =>
      save("Cena adicionada à sessão.", () =>
        api.associateScene(sessionId, sceneId),
      ),
    deleteCampaign: (campaignId: string) =>
      save("Campanha excluída.", () => api.deleteCampaign(campaignId)),
    deleteSession: (sessionId: string) =>
      save("Sessão excluída.", () => api.deleteSession(sessionId)),
    deleteScene: (sceneId: string) =>
      save("Cena excluída.", () => api.deleteScene(sceneId)),
    deleteSceneLevel: (levelId: string) =>
      save("Nível excluído.", () => api.deleteSceneLevel(levelId)),
    removeSceneFromSession: (sessionId: string, sceneId: string) =>
      save("Cena removida da sessão.", () =>
        api.removeSceneFromSession(sessionId, sceneId),
      ),
  };
}

export type CoreWorkspace = ReturnType<typeof useCoreWorkspace>;
