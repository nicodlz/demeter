import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { NetWorthPage } from '@/pages/NetWorthPage';
import { ProjectionsPage } from '@/pages/ProjectionsPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DataPage } from '@/pages/DataPage';
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

const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/expenses',
  component: ExpensesPage,
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

const dataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data',
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
  expensesRoute,
  netWorthRoute,
  projectionsRoute,
  billingInvoicesRoute,
  billingClientsRoute,
  billingSettingsRoute,
  dataRoute,
]);

// --- Router instance ---

export const router = createRouter({ routeTree });

// Register the router for type-safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
