import { useState } from "react";
import { LoadFailure } from "@/components";
import { useCoreWorkspace } from "@/hooks";
import {
  AudioLibraryPage,
  CampaignListPage,
  CampaignPreparationPage,
  SceneLibraryPage,
  ScenePreparationPage,
  SettingsPage,
  SessionRuntimePage,
} from "@/pages";
import type { AppRoute } from "./navigation";
import type { PrimarySection } from "./PrimaryNavigation";
import { WorkspaceLayout } from "./WorkspaceLayout";
import styles from "./AppShell.module.scss";

export function AppShell() {
  const [route, setRoute] = useState<AppRoute>({ screen: "campaign-list" });

  const navigatePrimary = (section: PrimarySection) => {
    const routes: Record<PrimarySection, AppRoute> = {
      campaigns: { screen: "campaign-list" },
      scenes: { screen: "scene-library" },
      audio: { screen: "audio-library" },
      settings: { screen: "settings" },
    };
    setRoute(routes[section]);
  };

  if (route.screen === "settings") {
    return (
      <WorkspaceLayout active="settings" onNavigate={navigatePrimary}>
        <SettingsPage />
      </WorkspaceLayout>
    );
  }

  if (route.screen === "audio-library") {
    return (
      <WorkspaceLayout active="audio" onNavigate={navigatePrimary}>
        <AudioLibraryPage
          onOpenSettings={() => setRoute({ screen: "settings" })}
        />
      </WorkspaceLayout>
    );
  }

  return (
    <CoreWorkspaceScreen
      route={route}
      onRoute={setRoute}
      onNavigatePrimary={navigatePrimary}
    />
  );
}

interface CoreWorkspaceScreenProps {
  route: Exclude<AppRoute, { screen: "audio-library" | "settings" }>;
  onRoute: (route: AppRoute) => void;
  onNavigatePrimary: (section: PrimarySection) => void;
}

function CoreWorkspaceScreen({
  route,
  onRoute,
  onNavigatePrimary,
}: CoreWorkspaceScreenProps) {
  const workspace = useCoreWorkspace();
  const runtime = route.screen === "session-runtime";
  const active: PrimarySection =
    route.screen === "scene-library" || route.screen === "scene-preparation"
      ? "scenes"
      : "campaigns";

  const content = workspace.loading ? (
    <main className={styles.loading}>Abrindo seu espaço de jogo…</main>
  ) : !workspace.loaded ? (
    <main className={styles.loading}>
      <LoadFailure
        message={workspace.loadError}
        onRetry={() => void workspace.reload()}
      />
    </main>
  ) : (
    renderCoreRoute(route, workspace, onRoute)
  );

  return runtime ? (
    content
  ) : (
    <WorkspaceLayout active={active} onNavigate={onNavigatePrimary}>
      {content}
    </WorkspaceLayout>
  );
}

function renderCoreRoute(
  route: CoreWorkspaceScreenProps["route"],
  workspace: ReturnType<typeof useCoreWorkspace>,
  onRoute: (route: AppRoute) => void,
) {
  const campaignList = (
    <CampaignListPage
      workspace={workspace}
      onOpenCampaign={(campaignId) =>
        onRoute({ screen: "campaign-preparation", campaignId })
      }
    />
  );

  if (route.screen === "campaign-list") return campaignList;

  if (route.screen === "scene-library") {
    return (
      <SceneLibraryPage
        workspace={workspace}
        onOpenScene={(sceneId) =>
          onRoute({ screen: "scene-preparation", sceneId })
        }
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
        backLabel={campaign?.name ?? "Cenas"}
        scene={scene}
        workspace={workspace}
        onBack={() =>
          onRoute(
            campaign
              ? { screen: "campaign-preparation", campaignId: campaign.id }
              : { screen: "scene-library" },
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
            onRoute({ screen: "campaign-preparation", campaignId: campaign.id })
          }
        />
      );
    }
  }

  return (
    <CampaignPreparationPage
      campaign={campaign}
      workspace={workspace}
      onBack={() => onRoute({ screen: "campaign-list" })}
      onManageScenes={() => onRoute({ screen: "scene-library" })}
      onOpenScene={(sceneId) =>
        onRoute({
          screen: "scene-preparation",
          campaignId: campaign.id,
          sceneId,
        })
      }
      onStartSession={(sessionId) =>
        onRoute({
          screen: "session-runtime",
          campaignId: campaign.id,
          sessionId,
        })
      }
    />
  );
}
