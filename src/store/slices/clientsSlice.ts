import type { StateCreator } from 'zustand';
import type { Client } from '../../types';
import type { StoreState, ClientsSlice } from '../types';

export const createClientsSlice: StateCreator<
  StoreState,
  [],
  [],
  ClientsSlice
> = (set) => ({
  clients: [],

  addClient: (client: Omit<Client, 'id'>) => {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
    };
    set((state) => ({ clients: [...state.clients, newClient] }));
    return newClient;
  },

  updateClient: (id, clientData) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === id ? { ...client, ...clientData } : client
      ),
    }));
  },

  deleteClient: (id) => {
    set((state) => ({
      clients: state.clients.filter((client) => client.id !== id),
    }));
  },
});
