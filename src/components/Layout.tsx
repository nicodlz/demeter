import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface NavLink {
  to: string;
  label: string;
}

interface NavItem {
  label: string;
  to?: string;
  children?: NavLink[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/crypto', label: 'Crypto' },
  { to: '/net-worth', label: 'Net Worth' },
  { to: '/projections', label: 'Projections' },
  {
    label: 'Billing',
    children: [
      { to: '/billing/invoices', label: 'Invoices' },
      { to: '/billing/clients', label: 'Clients' },
      { to: '/billing/settings', label: 'Settings' },
    ],
  },
  { to: '/configuration', label: 'Configuration' },
];

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname === to;
  };

  const isBillingActive = () => pathname.startsWith('/billing');

  const linkBaseClass = cn(
    buttonVariants({ variant: 'ghost' }),
    'h-16 rounded-none border-b-2 px-4'
  );

  const activeLinkClass = 'border-primary text-foreground';
  const inactiveLinkClass =
    'border-transparent text-muted-foreground hover:text-foreground hover:border-border';

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-foreground">Demeter</h1>
              </div>
              <div className="ml-10 flex space-x-2">
                {navItems.map((item) =>
                  item.children ? (
                    <DropdownMenu key={item.label}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            linkBaseClass,
                            isBillingActive()
                              ? activeLinkClass
                              : inactiveLinkClass
                          )}
                        >
                          {item.label}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {item.children.map((child) => (
                          <DropdownMenuItem key={child.to} asChild>
                            <Link
                              to={child.to}
                              className={cn(
                                'w-full cursor-pointer',
                                isActive(child.to) && 'bg-accent'
                              )}
                            >
                              {child.label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link
                      key={item.to}
                      to={item.to!}
                      className={cn(
                        linkBaseClass,
                        isActive(item.to!)
                          ? activeLinkClass
                          : inactiveLinkClass
                      )}
                    >
                      {item.label}
                    </Link>
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
