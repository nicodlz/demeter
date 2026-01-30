import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Button asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
};
