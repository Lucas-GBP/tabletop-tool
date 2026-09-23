import { useCallback, useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppSettingsDto } from "@/api";
import { api } from "@/api";
import { applicationErrorMessage } from "@/lib";

const emptySettings: AppSettingsDto = { assetDirectory: null };

export function useAppSettings() {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSettings(await api.getAppSettings());
    } catch (cause) {
      setError(applicationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function chooseAssetDirectory() {
    const directory = await open({ multiple: false, directory: true });
    if (typeof directory !== "string") return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setSettings(await api.configureAssetDirectory(directory));
      setNotice("Pasta de assets atualizada.");
      return true;
    } catch (cause) {
      setError(applicationErrorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { settings, loading, busy, error, notice, chooseAssetDirectory };
}
