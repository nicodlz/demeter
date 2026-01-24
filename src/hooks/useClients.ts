import { useState, useEffect } from 'react';
import type { Client } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>(() =>
    storage.get<Client[]>(STORAGE_KEYS.CLIENTS, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.CLIENTS, clients);
  }, [clients]);

  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
    };
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id ? { ...client, ...clientData } : client
      )
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
