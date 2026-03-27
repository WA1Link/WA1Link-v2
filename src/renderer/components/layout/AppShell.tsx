import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { useUIStore } from '../../stores/useUIStore';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Main Content */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'pl-64' : 'pl-16'}
        `}
      >
        <div className="p-6">{children}</div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
