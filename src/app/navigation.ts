export type AppRoute =
  | { screen: "campaign-list" }
  | { screen: "campaign-preparation"; campaignId: string }
  | { screen: "scene-preparation"; sceneId: string; campaignId?: string }
  | { screen: "session-runtime"; campaignId: string; sessionId: string };
