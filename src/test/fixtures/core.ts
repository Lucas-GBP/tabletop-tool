import type { CoreSnapshotDto } from "@/api";

export const empty: CoreSnapshotDto = { campaigns: [], scenes: [] };

export const initialScene: CoreSnapshotDto["scenes"][number] = {
  id: "scene-1",
  name: "Cena inicial",
  levels: [{ id: "level-1", sceneId: "scene-1", name: "Nível 1", position: 0 }],
};

export const campaignSnapshot: CoreSnapshotDto = {
  scenes: [initialScene],
  campaigns: [
    {
      id: "campaign-1",
      name: "Sombras do Norte",
      sessions: [
        {
          id: "session-1",
          campaignId: "campaign-1",
          name: "Sessão 1",
          position: 0,
          scenes: [
            {
              id: "link-1",
              sessionId: "session-1",
              sceneId: "scene-1",
              position: 0,
            },
          ],
        },
      ],
    },
  ],
};
