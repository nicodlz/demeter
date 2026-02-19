import { useState, useRef } from 'react';
import { storage } from '@/utils/storage';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';

export function useDataPage() {
  const { settings, updateSettings } = useSettings();
  const toast = useToast();

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [zerionApiKey, setZerionApiKey] = useState(settings.zerionApiKey || '');
  const [ibkrFlexToken, setIbkrFlexToken] = useState(settings.ibkrFlexToken || '');
  const [ibkrFlexQueryId, setIbkrFlexQueryId] = useState(settings.ibkrFlexQueryId || '');
  const [taxProvisionEnabled, setTaxProvisionEnabled] = useState(settings.taxProvisionEnabled ?? false);
  const [taxRate, setTaxRate] = useState(settings.taxRate ?? 30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupInfo = storage.exportAll();
  const stats = {
    invoices: Array.isArray(backupInfo.data.invoices) ? backupInfo.data.invoices.length : 0,
    clients: Array.isArray(backupInfo.data.clients) ? backupInfo.data.clients.length : 0,
    expenses: Array.isArray(backupInfo.data.expenses) ? backupInfo.data.expenses.length : 0,
    snapshots: Array.isArray(backupInfo.data.netWorthSnapshots) ? backupInfo.data.netWorthSnapshots.length : 0,
    savedItems: Array.isArray(backupInfo.data.savedItems) ? backupInfo.data.savedItems.length : 0,
    categoryMappings: Array.isArray(backupInfo.data.categoryMappings) ? backupInfo.data.categoryMappings.length : 0,
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
        setImportStatus({ type: 'success', message: 'Backup imported successfully! Refreshing...' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Invalid backup file' });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveApiKey = () => {
    updateSettings({ zerionApiKey: zerionApiKey || undefined });
    toast.success('API key saved!');
  };

  const handleSaveTaxSettings = () => {
    updateSettings({ taxProvisionEnabled, taxRate });
    toast.success('Tax provision settings saved!');
  };

  const handleSaveIbkrCredentials = () => {
    updateSettings({
      ibkrFlexToken: ibkrFlexToken || undefined,
      ibkrFlexQueryId: ibkrFlexQueryId || undefined,
    });
    toast.success('IBKR credentials saved!');
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
