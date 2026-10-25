import { useState, useRef } from "react";
import { storage } from "@/utils/storage";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";
import { useStore } from "@/store";

export function useDataPage() {
  const { settings, updateSettings } = useSettings();
  const toast = useToast();

  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [zerionApiKey, setZerionApiKey] = useState(settings.zerionApiKey || "");
  const [ibkrFlexToken, setIbkrFlexToken] = useState(
    settings.ibkrFlexToken || "",
  );
  const [ibkrFlexQueryId, setIbkrFlexQueryId] = useState(
    settings.ibkrFlexQueryId || "",
  );
  const [taxProvisionEnabled, setTaxProvisionEnabled] = useState(
    settings.taxProvisionEnabled ?? false,
  );
  const [taxRate, setTaxRate] = useState(settings.taxRate ?? 30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invoices = useStore((state) => state.invoices);
  const clients = useStore((state) => state.clients);
  const expenses = useStore((state) => state.expenses);
  const snapshots = useStore((state) => state.snapshots);
  const savedItems = useStore((state) => state.savedItems);
  const mappings = useStore((state) => state.mappings);

  const stats = {
    invoices: invoices.length,
    clients: clients.length,
    expenses: expenses.length,
    snapshots: snapshots.length,
    savedItems: savedItems.length,
    categoryMappings: mappings.length,
  };

  const handleExport = () => {
    storage.downloadBackup();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = storage.importBackup(parsed);

      if (result.success) {
        // Reload the store from the freshly written localStorage keys so the
        // import is visible immediately and can be pushed to the vault.
        await useStore.persist.rehydrate();
        setImportStatus({
          type: "success",
          message: "Backup imported successfully!",
        });
        toast.success("Backup imported!");
      } else {
        setImportStatus({
          type: "error",
          message: result.error || "Import failed",
        });
      }
    } catch {
      setImportStatus({ type: "error", message: "Invalid backup file" });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveApiKey = () => {
    updateSettings({ zerionApiKey: zerionApiKey || undefined });
    toast.success("API key saved!");
  };

  const handleSaveTaxSettings = () => {
    updateSettings({ taxProvisionEnabled, taxRate });
    toast.success("Tax provision settings saved!");
  };

  const handleSaveIbkrCredentials = () => {
    updateSettings({
      ibkrFlexToken: ibkrFlexToken || undefined,
      ibkrFlexQueryId: ibkrFlexQueryId || undefined,
    });
    toast.success("IBKR credentials saved!");
  };

  return {
    // State
    importStatus,
    zerionApiKey,
    setZerionApiKey,
    ibkrFlexToken,
    setIbkrFlexToken,
    ibkrFlexQueryId,
    setIbkrFlexQueryId,
    taxProvisionEnabled,
    setTaxProvisionEnabled,
    taxRate,
    setTaxRate,
    fileInputRef,
    // Derived
    stats,
    // Handlers
    handleExport,
    handleImportClick,
    handleFileChange,
    handleSaveApiKey,
    handleSaveTaxSettings,
    handleSaveIbkrCredentials,
  };
}
