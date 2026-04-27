import React from 'react';
import { AppShell } from './components/layout/AppShell';
import { LicenseGate } from './components/license/LicenseGate';
import { AgreementGate } from './components/agreement/AgreementGate';
import { useUIStore } from './stores/useUIStore';
import { useGlobalSubscriptions } from './hooks/useGlobalSubscriptions';
import { MessagingPage } from './pages/MessagingPage';
import { ContactsPage } from './pages/ContactsPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { SettingsPage } from './pages/SettingsPage';
import { CRMPage } from './pages/CRMPage';

const PageRouter: React.FC = () => {
  const currentPage = useUIStore((state) => state.currentPage);

  switch (currentPage) {
    case 'messaging':
      return <MessagingPage />;
    case 'contacts':
      return <ContactsPage />;
    case 'scheduler':
      return <SchedulerPage />;
    case 'crm':
      return <CRMPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <MessagingPage />;
  }
};

const App: React.FC = () => {
  // Subscribe to renderer-wide IPC events at the app root so progress/complete
  // events keep flowing into the stores even when the user navigates away
  // from the page that originated the action.
  useGlobalSubscriptions();

  return (
    <AgreementGate>
      <LicenseGate>
        <AppShell>
          <PageRouter />
        </AppShell>
      </LicenseGate>
    </AgreementGate>
  );
};

export default App;
