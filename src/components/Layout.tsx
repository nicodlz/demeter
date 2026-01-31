import { useState, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ChevronDown, Menu } from 'lucide-react';

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
  { to: '/cash-flow', label: 'Cash Flow' },
  {
    label: 'Portfolio',
    children: [
      { to: '/crypto', label: 'Crypto' },
      { to: '/ibkr', label: 'IBKR' },
      { to: '/net-worth', label: 'Net Worth' },
      { to: '/projections', label: 'Projections' },
    ],
  },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname === to;
  };

  const portfolioPaths = ['/crypto', '/ibkr', '/net-worth', '/projections'];
  const isPortfolioActive = () => portfolioPaths.some((p) => pathname === p);
  const isBillingActive = () => pathname.startsWith('/billing');

  const isDropdownActive = (label: string) => {
    if (label === 'Portfolio') return isPortfolioActive();
    if (label === 'Billing') return isBillingActive();
    return false;
  };

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

              {/* Desktop navigation */}
              <div className="ml-10 hidden md:flex space-x-2">
                {navItems.map((item) =>
                  item.children ? (
                    <DropdownMenu key={item.label}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            linkBaseClass,
                            isDropdownActive(item.label)
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

            {/* Mobile hamburger button */}
            <div className="flex items-center md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="h-10 w-10"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-left text-xl font-bold">Demeter</SheetTitle>
            <SheetDescription className="text-left sr-only">Navigation menu</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col py-2 overflow-y-auto">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label}>
                  <div className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </div>
                  {item.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center px-8 py-3 text-sm transition-colors min-h-[44px]',
                        isActive(child.to)
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.to}
                  to={item.to!}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center px-6 py-3 text-sm transition-colors min-h-[44px]',
                    isActive(item.to!)
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
};
