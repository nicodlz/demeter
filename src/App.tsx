import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { ThemeProvider } from '@/components/theme-provider';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
