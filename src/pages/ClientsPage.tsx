import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import type { Client } from '@/schemas';
import { ClientForm } from '@/components/ClientForm';

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
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export const ClientsPage = () => {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleAddClient = (clientData: Omit<Client, 'id'>) => {
    addClient(clientData);
    setShowForm(false);
  };

  const handleUpdateClient = (clientData: Omit<Client, 'id'>) => {
    if (editingClient) {
      updateClient(editingClient.id, clientData);
      setEditingClient(null);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(false);
  };

  const handleDeleteClient = (id: string) => {
    deleteClient(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage your clients and their information
          </p>
        </div>
        {!showForm && !editingClient && (
          <Button size="sm" onClick={() => setShowForm(true)} className="min-h-[44px] sm:min-h-0 self-start">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Client</CardTitle>
            <CardDescription>Add a new client to your list</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm onSubmit={handleAddClient} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {editingClient && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Client</CardTitle>
            <CardDescription>Modify client details</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm
              client={editingClient}
              onSubmit={handleUpdateClient}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No clients yet. Start by adding your first client.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden md:table-cell">Country</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.city}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.country}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {client.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(client.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
