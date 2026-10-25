import { lazy } from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { PageRoute } from "@/components/PageRoute";
import { NotFoundPage } from "@/pages/NotFoundPage";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const CashFlowPage = lazy(() =>
  import("@/pages/CashFlowPage").then((m) => ({ default: m.CashFlowPage })),
);
const NetWorthPage = lazy(() =>
  import("@/pages/NetWorthPage").then((m) => ({ default: m.NetWorthPage })),
);
const ProjectionsPage = lazy(() =>
  import("@/pages/ProjectionsPage").then((m) => ({
    default: m.ProjectionsPage,
  })),
);
const InvoicesPage = lazy(() =>
  import("@/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })),
);
const ClientsPage = lazy(() =>
  import("@/pages/ClientsPage").then((m) => ({ default: m.ClientsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const CryptoPage = lazy(() =>
  import("@/pages/CryptoPage").then((m) => ({ default: m.CryptoPage })),
);
const DataPage = lazy(() =>
  import("@/pages/DataPage").then((m) => ({ default: m.DataPage })),
);
const IbkrPage = lazy(() =>
  import("@/pages/IbkrPage").then((m) => ({ default: m.IbkrPage })),
);

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
  path: "/",
  component: () => (
    <PageRoute>
      <DashboardPage />
    </PageRoute>
  ),
});

const cashFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cash-flow",
  component: () => (
    <PageRoute>
      <CashFlowPage />
    </PageRoute>
  ),
});

// Redirect /expenses → /cash-flow for backward compatibility
const expensesRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expenses",
  beforeLoad: () => {
    throw redirect({ to: "/cash-flow" }) as unknown as Error;
  },
});

const cryptoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crypto",
  component: () => (
    <PageRoute>
      <CryptoPage />
    </PageRoute>
  ),
});

const netWorthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/net-worth",
  component: () => (
    <PageRoute>
      <NetWorthPage />
    </PageRoute>
  ),
});

const projectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projections",
  component: () => (
    <PageRoute>
      <ProjectionsPage />
    </PageRoute>
  ),
});

const ibkrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ibkr",
  component: () => (
    <PageRoute>
      <IbkrPage />
    </PageRoute>
  ),
});

const configurationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/configuration",
  component: () => (
    <PageRoute>
      <DataPage />
    </PageRoute>
  ),
});

// --- Billing routes ---

const billingInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing/invoices",
  component: () => (
    <PageRoute>
      <InvoicesPage />
    </PageRoute>
  ),
});

const billingClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing/clients",
  component: () => (
    <PageRoute>
      <ClientsPage />
    </PageRoute>
  ),
});

const billingSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing/settings",
  component: () => (
    <PageRoute>
      <SettingsPage />
    </PageRoute>
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
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
