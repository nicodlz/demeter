import { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { NetWorthPage } from './pages/NetWorthPage';
import { ProjectionsPage } from './pages/ProjectionsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ClientsPage } from './pages/ClientsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DataPage } from './pages/DataPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'patrimoine':
        return <NetWorthPage />;
      case 'projections':
        return <ProjectionsPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'clients':
        return <ClientsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'data':
        return <DataPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
