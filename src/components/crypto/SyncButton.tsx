import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncButtonProps {
  syncing: boolean;
  lastSyncAt: string | null;
  disabled?: boolean;
  onSync: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export const SyncButton = ({ syncing, lastSyncAt, disabled, onSync }: SyncButtonProps) => {
  return (
    <div className="flex items-center gap-3">
      {lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          Last synced {timeAgo(lastSyncAt)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing || disabled}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync'}
      </Button>
    </div>
  );
};
