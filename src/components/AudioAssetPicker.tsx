import { useEffect, useMemo, useState } from "react";
import type { AudioAssetDto } from "@/api";
import { Button, EmptyState, Input, SectionHeading } from "./primitives";
import styles from "./AudioAssetPicker.module.scss";

interface AudioAssetPickerProps {
  assets: readonly AudioAssetDto[];
  title: string;
  busy?: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onSelect: (asset: AudioAssetDto) => void;
}

export function AudioAssetPicker({
  assets,
  title,
  busy = false,
  onRefresh,
  onClose,
  onSelect,
}: AudioAssetPickerProps) {
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
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Fechar seletor de áudio"
        onClick={onClose}
      />
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
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
            autoFocus
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
              onClick={() => onSelect(asset)}
            >
              <strong>{asset.name}</strong>
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
    </div>
  );
}

function assetFolder(asset: AudioAssetDto) {
  const separator = asset.relativePath.lastIndexOf("/");
  return separator < 0 ? "Raiz" : asset.relativePath.slice(0, separator);
}
