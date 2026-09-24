export type AppRoute =
  | { screen: "campaign-list" }
  | { screen: "scene-library" }
  | { screen: "audio-library" }
  | { screen: "settings" }
  | { screen: "campaign-preparation"; campaignId: string }
  | { screen: "scene-preparation"; sceneId: string; campaignId?: string }
  | { screen: "session-runtime"; campaignId: string; sessionId: string };
