import { useCallback } from 'react';
import { useStore } from '../store';

export const useClients = () => {
  const clients = useStore((state) => state.clients);
  const addClient = useStore((state) => state.addClient);
  const updateClient = useStore((state) => state.updateClient);
  const deleteClient = useStore((state) => state.deleteClient);

  const getClientById = useCallback(
    (id: string) => clients.find((client) => client.id === id),
    [clients]
  );

  return {
    clients,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
  };
};
