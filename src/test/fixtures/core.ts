import type { CoreSnapshotDto } from "@/api";
import { testId } from "@/test/ids";

export const empty: CoreSnapshotDto = { campaigns: [], scenes: [] };

export const initialScene: CoreSnapshotDto["scenes"][number] = {
  id: testId.scene("scene-1"),
  name: "Cena inicial",
  levels: [
    {
      id: testId.sceneLevel("level-1"),
      sceneId: testId.scene("scene-1"),
      name: "Nível 1",
      position: 0,
    },
  ],
};

export const campaignSnapshot: CoreSnapshotDto = {
  scenes: [initialScene],
  campaigns: [
    {
      id: testId.campaign("campaign-1"),
      name: "Sombras do Norte",
      sessions: [
        {
          id: testId.session("session-1"),
          campaignId: testId.campaign("campaign-1"),
          name: "Sessão 1",
          position: 0,
          scenes: [
            {
              id: testId.sessionScene("link-1"),
              sessionId: testId.session("session-1"),
              sceneId: testId.scene("scene-1"),
              position: 0,
            },
          ],
        },
      ],
    },
  ],
};
