import { useState } from "react";
import { Input, SceneLibrary, WorkspaceFeedback } from "@/components";
import type { CoreWorkspace } from "@/hooks";
import type { SceneId } from "@/types";
import styles from "./SceneLibraryPage.module.scss";

interface SceneLibraryPageProps {
  workspace: CoreWorkspace;
  onOpenScene: (sceneId: SceneId) => void;
}

export function SceneLibraryPage({
  workspace,
  onOpenScene,
}: SceneLibraryPageProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const scenes = workspace.snapshot.scenes.filter(
    (scene) =>
      !normalizedQuery ||
      scene.name.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <p>Biblioteca reutilizável</p>
        <h1>Cenas</h1>
        <span>Prepare cenas uma vez e associe-as a diferentes sessões.</span>
      </header>
      <WorkspaceFeedback error={workspace.error} />
      <Input
        className={styles.search}
        type="search"
        aria-label="Buscar cenas"
        placeholder="Buscar cenas"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <SceneLibrary
        scenes={scenes}
        totalSceneCount={workspace.snapshot.scenes.length}
        disabled={workspace.busy}
        onCreateScene={workspace.createScene}
        onOpenScene={onOpenScene}
      />
    </main>
  );
}
