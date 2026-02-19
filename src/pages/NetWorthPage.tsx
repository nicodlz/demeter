import { useState } from 'react';
import { useNetWorthSnapshots, getSnapshotTotal, getCategoryTotal } from '@/hooks/useNetWorthSnapshots';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSettings } from '@/hooks/useSettings';
import type { AnyNetWorthSnapshot, NetWorthSnapshotV2 } from '@/schemas';
import { SnapshotForm } from '@/components/networth/SnapshotForm';
import { formatCurrency, formatDate } from '@/utils/formatters';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Download, Pencil, Trash2 } from 'lucide-react';

export const NetWorthPage = () => {
  const {
    addSnapshot,
    updateSnapshot,
    deleteSnapshot,
    getSortedSnapshots,
    exportAsJSON,
  } = useNetWorthSnapshots();
  const { convert } = useExchangeRate();
  const { settings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<AnyNetWorthSnapshot | null>(null);

  const sortedSnapshots = getSortedSnapshots();
  const currency = settings.dashboardCurrency || 'USD';

  const handleAddSnapshot = (
    data: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addSnapshot(data);
    setShowForm(false);
  };

  const handleUpdateSnapshot = (
    data: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingSnapshot) {
      updateSnapshot(editingSnapshot.id, data);
      setEditingSnapshot(null);
    }
  };

  const handleEditSnapshot = (snapshot: AnyNetWorthSnapshot) => {
    setEditingSnapshot(snapshot);
    setShowForm(false);
  };

  const handleDeleteSnapshot = (id: string) => {
    deleteSnapshot(id);
  };

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <SnapshotForm
          currency={currency}
          onSubmit={handleAddSnapshot}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (editingSnapshot) {
    return (
      <div className="max-w-2xl mx-auto">
        <SnapshotForm
          snapshot={editingSnapshot}
          currency={currency}
          onSubmit={handleUpdateSnapshot}
          onCancel={() => setEditingSnapshot(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Net Worth</h2>
          <p className="text-sm text-muted-foreground">
            Track your net worth over time with snapshots
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportAsJSON} className="min-h-[44px] sm:min-h-0">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="min-h-[44px] sm:min-h-0">
            <Plus className="h-4 w-4 mr-2" />
            New Snapshot
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
          <CardDescription>
            {sortedSnapshots.length} snapshot{sortedSnapshots.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSnapshots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No snapshots yet. Start tracking your net worth by adding your first snapshot.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Snapshot
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Stocks</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Crypto</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Cash</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Stablecoins</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">
                      {formatDate(snapshot.date)}
                      {snapshot.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {snapshot.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell whitespace-nowrap">
                      {formatCurrency(getCategoryTotal(snapshot, 'stocks', convert), 'USD')}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell whitespace-nowrap">
                      {formatCurrency(getCategoryTotal(snapshot, 'crypto', convert), 'USD')}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                      {formatCurrency(getCategoryTotal(snapshot, 'cash', convert), 'USD')}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell whitespace-nowrap">
                      {formatCurrency(getCategoryTotal(snapshot, 'stablecoins', convert), 'USD')}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(getSnapshotTotal(snapshot, convert), 'USD')}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditSnapshot(snapshot)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this snapshot from{' '}
                              {formatDate(snapshot.date)}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSnapshot(snapshot.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
