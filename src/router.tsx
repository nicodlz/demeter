import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
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
  component: () => (
    <PageErrorBoundary>
      <DashboardPage />
    </PageErrorBoundary>
  ),
});

const cashFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cash-flow',
  component: () => (
    <PageErrorBoundary>
      <CashFlowPage />
    </PageErrorBoundary>
  ),
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
  component: () => (
    <PageErrorBoundary>
      <CryptoPage />
    </PageErrorBoundary>
  ),
});

const netWorthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/net-worth',
  component: () => (
    <PageErrorBoundary>
      <NetWorthPage />
    </PageErrorBoundary>
  ),
});

const projectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projections',
  component: () => (
    <PageErrorBoundary>
      <ProjectionsPage />
    </PageErrorBoundary>
  ),
});

const ibkrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ibkr',
  component: () => (
    <PageErrorBoundary>
      <IbkrPage />
    </PageErrorBoundary>
  ),
});

const configurationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuration',
  component: () => (
    <PageErrorBoundary>
      <DataPage />
    </PageErrorBoundary>
  ),
});

// --- Billing routes ---

const billingInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/invoices',
  component: () => (
    <PageErrorBoundary>
      <InvoicesPage />
    </PageErrorBoundary>
  ),
});

const billingClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/clients',
  component: () => (
    <PageErrorBoundary>
      <ClientsPage />
    </PageErrorBoundary>
  ),
});

const billingSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/settings',
  component: () => (
    <PageErrorBoundary>
      <SettingsPage />
    </PageErrorBoundary>
  ),
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
