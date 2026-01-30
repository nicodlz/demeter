import { useStore } from '../store';

export const useSettings = () => {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const updateIssuer = useStore((state) => state.updateIssuer);
  const incrementInvoiceCounter = useStore((state) => state.incrementInvoiceCounter);

  return {
    settings,
    updateSettings,
    updateIssuer,
    incrementInvoiceCounter,
  };
};
