import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { CashFlowPage } from '@/pages/CashFlowPage';
import { NetWorthPage } from '@/pages/NetWorthPage';
import { ProjectionsPage } from '@/pages/ProjectionsPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CryptoPage } from '@/pages/CryptoPage';
import { DataPage } from '@/pages/DataPage';
import { IbkrPage } from '@/pages/IbkrPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Root route — wraps everything in the Layout shell
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: NotFoundPage,
});

// --- Top-level routes ---

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const cashFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cash-flow',
  component: CashFlowPage,
});

// Redirect /expenses → /cash-flow for backward compatibility
const expensesRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/expenses',
  beforeLoad: () => {
    throw redirect({ to: '/cash-flow' });
  },
});

const cryptoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/crypto',
  component: CryptoPage,
});

const netWorthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/net-worth',
  component: NetWorthPage,
});

const projectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projections',
  component: ProjectionsPage,
});

const ibkrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ibkr',
  component: IbkrPage,
});

const configurationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuration',
  component: DataPage,
});

// --- Billing routes ---

const billingInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/invoices',
  component: InvoicesPage,
});

const billingClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/clients',
  component: ClientsPage,
});

const billingSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/settings',
  component: SettingsPage,
});

// --- Route tree ---

const routeTree = rootRoute.addChildren([
  indexRoute,
  cashFlowRoute,
  expensesRedirectRoute,
  cryptoRoute,
  ibkrRoute,
  netWorthRoute,
  projectionsRoute,
  billingInvoicesRoute,
  billingClientsRoute,
  billingSettingsRoute,
  configurationRoute,
]);

// --- Router instance ---

export const router = createRouter({ routeTree });

// Register the router for type-safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
