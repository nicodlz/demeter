import { useState, useEffect } from 'react';
import type { AppSettings } from '../types';
import { appSettingsSchema } from '../schemas';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_SETTINGS } from '../utils/constants';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() =>
    storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      const result = appSettingsSchema.safeParse(updated);
      if (!result.success) {
        console.error('[Demeter] Invalid settings update:', result.error.issues);
        return prev;
      }
      return result.data;
    });
  };

  const updateIssuer = (issuerData: Partial<AppSettings['issuer']>) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        issuer: { ...prev.issuer, ...issuerData },
      };
      const result = appSettingsSchema.safeParse(updated);
      if (!result.success) {
        console.error('[Demeter] Invalid issuer update:', result.error.issues);
        return prev;
      }
      return result.data;
    });
  };

  const incrementInvoiceCounter = (): number => {
    // Read fresh from localStorage to avoid race conditions
    const currentSettings = storage.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const newCounter = currentSettings.invoiceCounter + 1;

    // Update both localStorage and state atomically
    const updatedSettings = { ...currentSettings, invoiceCounter: newCounter };
    storage.set(STORAGE_KEYS.SETTINGS, updatedSettings);
    setSettings(updatedSettings);

    return newCounter;
  };

  return {
    settings,
    updateSettings,
    updateIssuer,
    incrementInvoiceCounter,
  };
};
