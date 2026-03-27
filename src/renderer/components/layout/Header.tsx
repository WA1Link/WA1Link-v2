import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useAccountStore } from '../../stores/useAccountStore';

export const Header: React.FC = () => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);
  const accounts = useAccountStore((state) => state.accounts);
  const connectionStatus = useAccountStore((state) => state.connectionStatus);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const status = activeAccountId ? connectionStatus.get(activeAccountId) : undefined;

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'qr_ready':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'qr_ready':
        return 'Scan QR Code';
      case 'logged_out':
        return 'Logged Out';
      default:
        return 'Disconnected';
    }
  };

  return (
    <header
      className={`
        fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'left-64' : 'left-16'}
      `}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Toggle & Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Right: Account Status */}
        <div className="flex items-center gap-4">
          {activeAccount && (
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{activeAccount.name}</p>
                <p className="text-xs text-gray-500">{getStatusText()}</p>
              </div>
            </div>
          )}

          {!activeAccount && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>No account connected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
