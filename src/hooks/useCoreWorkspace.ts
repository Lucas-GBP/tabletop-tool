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
      mutate("Sessão criada.", () =>
        api.createSession(campaignId, name, sceneId),
      ).then(Boolean),
    createSceneLevel: (sceneId: string, name: string) =>
      mutate("Nível adicionado.", () =>
        api.createSceneLevel(sceneId, name),
      ).then(Boolean),
    renameCampaign: (campaignId: string, name: string) =>
      mutate("Campanha renomeada.", () =>
        api.renameCampaign(campaignId, name),
      ).then(Boolean),
    renameSession: (sessionId: string, name: string) =>
      mutate("Sessão renomeada.", () =>
        api.renameSession(sessionId, name),
      ).then(Boolean),
    renameScene: (sceneId: string, name: string) =>
      mutate("Cena renomeada.", () => api.renameScene(sceneId, name)).then(
        Boolean,
      ),
    renameSceneLevel: (levelId: string, name: string) =>
      mutate("Nível renomeado.", () =>
        api.renameSceneLevel(levelId, name),
      ).then(Boolean),
    associateScene: (sessionId: string, sceneId: string) =>
      mutate("Cena adicionada à sessão.", () =>
        api.associateScene(sessionId, sceneId),
      ).then(Boolean),
    deleteCampaign: (campaignId: string) =>
      mutate("Campanha excluída.", () => api.deleteCampaign(campaignId)).then(
        Boolean,
      ),
    deleteSession: (sessionId: string) =>
      mutate("Sessão excluída.", () => api.deleteSession(sessionId)).then(
        Boolean,
      ),
    deleteScene: (sceneId: string) =>
      mutate("Cena excluída.", () => api.deleteScene(sceneId)).then(Boolean),
    deleteSceneLevel: (levelId: string) =>
      mutate("Nível excluído.", () => api.deleteSceneLevel(levelId)).then(
        Boolean,
      ),
    removeSceneFromSession: (sessionId: string, sceneId: string) =>
      mutate("Cena removida da sessão.", () =>
        api.removeSceneFromSession(sessionId, sceneId),
      ).then(Boolean),
  };
}

export type CoreWorkspace = ReturnType<typeof useCoreWorkspace>;
