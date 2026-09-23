import { useState } from "react";
import { LoadFailure } from "@/components";
import { useCoreWorkspace } from "@/hooks";
import {
  AudioLibraryPage,
  AudioObjectEditorPage,
  CampaignListPage,
  CampaignPreparationPage,
  ScenePreparationPage,
  SettingsPage,
  SessionRuntimePage,
} from "@/pages";
import type { AppRoute } from "./navigation";
import styles from "./AppShell.module.scss";

export function AppShell() {
  const workspace = useCoreWorkspace();
  const [route, setRoute] = useState<AppRoute>({ screen: "campaign-list" });

  if (workspace.loading) {
    return <main className={styles.loading}>Abrindo seu espaço de jogo…</main>;
  }

  if (!workspace.loaded) {
    return (
      <main className={styles.loading}>
        <LoadFailure
          message={workspace.loadError}
          onRetry={() => void workspace.reload()}
        />
      </main>
    );
  }

  const campaignList = (
    <CampaignListPage
      workspace={workspace}
      onOpenCampaign={(campaignId) =>
        setRoute({ screen: "campaign-preparation", campaignId })
      }
      onOpenScene={(sceneId) =>
        setRoute({ screen: "scene-preparation", sceneId })
      }
      onOpenAudioLibrary={() => setRoute({ screen: "audio-library" })}
      onOpenSettings={() => setRoute({ screen: "settings" })}
    />
  );

  if (route.screen === "campaign-list") return campaignList;

  if (route.screen === "settings") {
    return (
      <SettingsPage onBack={() => setRoute({ screen: "campaign-list" })} />
    );
  }

  if (route.screen === "audio-library") {
    return (
      <AudioLibraryPage
        onBack={() => setRoute({ screen: "campaign-list" })}
        onOpenSettings={() => setRoute({ screen: "settings" })}
        onEditObject={(audioObjectId) =>
          setRoute({ screen: "audio-object-editor", audioObjectId })
        }
      />
    );
  }

  if (route.screen === "audio-object-editor") {
    return (
      <AudioObjectEditorPage
        audioObjectId={route.audioObjectId}
        onBack={() => setRoute({ screen: "audio-library" })}
      />
    );
  }

  if (route.screen === "scene-preparation") {
    const scene = workspace.snapshot.scenes.find(
      (item) => item.id === route.sceneId,
    );
    const campaign = route.campaignId
      ? workspace.snapshot.campaigns.find(
          (item) => item.id === route.campaignId,
        )
      : undefined;

    if (!scene || (route.campaignId && !campaign)) return campaignList;

    return (
      <ScenePreparationPage
        backLabel={campaign?.name ?? "Início"}
        scene={scene}
        workspace={workspace}
        onBack={() =>
          setRoute(
            campaign
              ? {
                  screen: "campaign-preparation",
                  campaignId: campaign.id,
                }
              : { screen: "campaign-list" },
          )
        }
      />
    );
  }

  const campaign = workspace.snapshot.campaigns.find(
    (item) => item.id === route.campaignId,
  );

  if (!campaign) return campaignList;

  if (route.screen === "session-runtime") {
    const session = campaign.sessions.find(
      (item) => item.id === route.sessionId,
    );
    if (session) {
      return (
        <SessionRuntimePage
          campaign={campaign}
          session={session}
          scenes={workspace.snapshot.scenes}
          onEnd={() =>
            setRoute({
              screen: "campaign-preparation",
              campaignId: campaign.id,
            })
          }
        />
      );
    }
  }

  return (
    <CampaignPreparationPage
      campaign={campaign}
      workspace={workspace}
      onBack={() => setRoute({ screen: "campaign-list" })}
      onManageScenes={() => setRoute({ screen: "campaign-list" })}
      onOpenScene={(sceneId) =>
        setRoute({
          screen: "scene-preparation",
          campaignId: campaign.id,
          sceneId,
        })
      }
      onStartSession={(sessionId) =>
        setRoute({
          screen: "session-runtime",
          campaignId: campaign.id,
          sessionId,
        })
      }
    />
  );
}
