import { useState, useEffect } from 'react';
import type { Client } from '../types';
import { clientSchema } from '../schemas';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>(() =>
    storage.get<Client[]>(STORAGE_KEYS.CLIENTS, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.CLIENTS, clients);
  }, [clients]);

  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient = {
      ...client,
      id: crypto.randomUUID(),
    };
    const result = clientSchema.safeParse(newClient);
    if (!result.success) {
      console.error('[Demeter] Invalid client data:', result.error.issues);
      return newClient as Client;
    }
    setClients((prev) => [...prev, result.data]);
    return result.data;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== id) return client;
        const updated = { ...client, ...clientData };
        const result = clientSchema.safeParse(updated);
        if (!result.success) {
          console.error('[Demeter] Invalid client update:', result.error.issues);
          return client;
        }
        return result.data;
      })
    );
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
  };

  const getClientById = (id: string) => {
    return clients.find((client) => client.id === id);
  };

  return {
    clients,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
  };
};
