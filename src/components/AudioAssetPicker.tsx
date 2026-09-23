import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioAssetDto } from "@/api";
import { Button, EmptyState, Input, SectionHeading } from "./primitives";
import styles from "./AudioAssetPicker.module.scss";

interface AudioAssetPickerProps {
  assets: readonly AudioAssetDto[];
  title: string;
  busy?: boolean;
  currentAssetPath?: string;
  onRefresh: () => void;
  onClose: () => void;
  onSelect: (asset: AudioAssetDto) => void;
}

export function AudioAssetPicker({
  assets,
  title,
  busy = false,
  currentAssetPath,
  onRefresh,
  onClose,
  onSelect,
}: AudioAssetPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const folders = useMemo(
    () => [...new Set(assets.map(assetFolder))].sort(),
    [assets],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredAssets = assets.filter(
    (asset) =>
      (folder === "all" || assetFolder(asset) === folder) &&
      (!normalizedQuery ||
        asset.name.toLocaleLowerCase().includes(normalizedQuery) ||
        asset.relativePath.toLocaleLowerCase().includes(normalizedQuery)),
  );

  useEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    searchRef.current?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      invoker?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-label={title}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.dialog}>
        <header className={styles.header}>
          <SectionHeading
            eyebrow={`${assets.length} arquivos disponíveis`}
            title={title}
          />
          <div className={styles.actions}>
            <Button disabled={busy} onClick={onRefresh}>
              Atualizar
            </Button>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </header>
        <div className={styles.filters}>
          <Input
            ref={searchRef}
            aria-label="Buscar arquivo de áudio"
            placeholder="Buscar por nome ou caminho"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <select
            aria-label="Filtrar arquivos por pasta"
            value={folder}
            onChange={(event) => setFolder(event.currentTarget.value)}
          >
            <option value="all">Todas as pastas</option>
            {folders.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.list}>
          {filteredAssets.map((asset) => (
            <button
              key={asset.relativePath}
              type="button"
              className={styles.asset}
              aria-current={
                asset.relativePath === currentAssetPath ? "true" : undefined
              }
              onClick={() => onSelect(asset)}
            >
              <strong>
                {asset.name}
                {asset.relativePath === currentAssetPath ? (
                  <span className={styles.current}>Atual</span>
                ) : null}
              </strong>
              <small>
                {asset.relativePath} ·{" "}
                {(asset.durationUs / 1_000_000).toFixed(1)} s
              </small>
            </button>
          ))}
          {filteredAssets.length === 0 ? (
            <EmptyState title="Nenhum arquivo encontrado">
              Ajuste a busca ou atualize a biblioteca.
            </EmptyState>
          ) : null}
        </div>
      </section>
    </dialog>
  );
}

function assetFolder(asset: AudioAssetDto) {
  const separator = asset.relativePath.lastIndexOf("/");
  return separator < 0 ? "Raiz" : asset.relativePath.slice(0, separator);
}
