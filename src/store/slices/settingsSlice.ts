import type { StateCreator } from 'zustand';
import type { StoreState, SettingsSlice } from '../types';
import { DEFAULT_SETTINGS } from '../../utils/constants';

export const createSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  updateIssuer: (issuerData) => {
    set((state) => ({
      settings: {
        ...state.settings,
        issuer: { ...state.settings.issuer, ...issuerData },
      },
    }));
  },

  incrementInvoiceCounter: () => {
    const currentSettings = get().settings;
    const newCounter = currentSettings.invoiceCounter + 1;
    set((state) => ({
      settings: { ...state.settings, invoiceCounter: newCounter },
    }));
    return newCounter;
  },
});
