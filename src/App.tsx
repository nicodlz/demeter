import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { ThemeProvider } from '@/components/theme-provider';
import { VaultProvider, useVault } from '@/lib/vault';
import { VaultAuth } from '@/components/VaultAuth';
import { Loader2 } from 'lucide-react';

/** Inner app — renders auth gate or main layout */
function AppContent() {
  const { isReady, isLoading } = useVault();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isReady) {
    return <VaultAuth />;
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <VaultProvider>
        <AppContent />
      </VaultProvider>
    </ThemeProvider>
  );
}

export default App;
