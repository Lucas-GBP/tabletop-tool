export type AppRoute =
  | { screen: "campaign-list" }
  | { screen: "audio-library" }
  | { screen: "settings" }
  | { screen: "audio-object-editor"; audioObjectId: string }
  | { screen: "campaign-preparation"; campaignId: string }
  | { screen: "scene-preparation"; sceneId: string; campaignId?: string }
  | { screen: "session-runtime"; campaignId: string; sessionId: string };
