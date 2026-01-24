import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'patrimoine', label: 'Net Worth' },
    { id: 'projections', label: 'Projections' },
    {
      id: 'facturation',
      label: 'Billing',
      children: [
        { id: 'invoices', label: 'Invoices' },
        { id: 'clients', label: 'Clients' },
        { id: 'settings', label: 'Settings' },
      ],
    },
  ];

  const isActiveParent = (item: NavItem): boolean => {
    if (item.children) {
      return item.children.some((child) => child.id === currentPage);
    }
    return item.id === currentPage;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-foreground">
                  Uncertified
                </h1>
              </div>
              <div className="ml-10 flex space-x-2">
                {navItems.map((item) =>
                  item.children ? (
                    <DropdownMenu key={item.id}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            'h-16 rounded-none border-b-2 px-4',
                            isActiveParent(item)
                              ? 'border-primary text-foreground'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          )}
                        >
                          {item.label}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {item.children.map((child) => (
                          <DropdownMenuItem
                            key={child.id}
                            onClick={() => onNavigate(child.id)}
                            className={cn(
                              currentPage === child.id && 'bg-accent'
                            )}
                          >
                            {child.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        'h-16 rounded-none border-b-2 px-4',
                        currentPage === item.id
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      )}
                    >
                      {item.label}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
