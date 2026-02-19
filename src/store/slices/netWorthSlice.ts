import { generateId } from '../../utils/id';
import type { StateCreator } from 'zustand';
import type { AnyNetWorthSnapshot, NetWorthSnapshotV2 } from '../../schemas';
import type { StoreState, NetWorthSlice } from '../types';

export const createNetWorthSlice: StateCreator<
  StoreState,
  [],
  [],
  NetWorthSlice
> = (set) => ({
  snapshots: [],

  addSnapshot: (snapshotData) => {
    const newSnapshot: NetWorthSnapshotV2 = {
      ...snapshotData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ snapshots: [...state.snapshots, newSnapshot] }));
    return newSnapshot;
  },

  updateSnapshot: (id, snapshotData) => {
    set((state) => ({
      snapshots: state.snapshots.map((snapshot): AnyNetWorthSnapshot => {
        if (snapshot.id !== id) return snapshot;
        const updatedSnapshot: NetWorthSnapshotV2 = {
          id: snapshot.id,
          createdAt: snapshot.createdAt,
          updatedAt: new Date().toISOString(),
          date: snapshotData.date,
          version: 2,
          stocks: snapshotData.stocks,
          crypto: snapshotData.crypto,
          cash: snapshotData.cash,
          stablecoins: snapshotData.stablecoins,
          notes: snapshotData.notes,
        };
        return updatedSnapshot;
      }),
    }));
  },

  deleteSnapshot: (id) => {
    set((state) => ({
      snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id),
    }));
  },

  importFromJSON: (jsonString) => {
    try {
      const imported = JSON.parse(jsonString) as AnyNetWorthSnapshot[];
      if (!Array.isArray(imported)) return false;
      set({ snapshots: imported });
      return true;
    } catch {
      return false;
    }
  },
});
