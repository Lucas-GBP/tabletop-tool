import type { CampaignId, SceneId, SessionId } from "@/types";

export type AppRoute =
  | { screen: "campaign-list" }
  | { screen: "scene-library" }
  | { screen: "audio-library" }
  | { screen: "settings" }
  | { screen: "campaign-preparation"; campaignId: CampaignId }
  | {
      screen: "scene-preparation";
      sceneId: SceneId;
      campaignId?: CampaignId;
    }
  | {
      screen: "session-runtime";
      campaignId: CampaignId;
      sessionId: SessionId;
    };
