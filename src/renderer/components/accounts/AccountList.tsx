import React from 'react';
import { Account, ConnectionStatus } from '../../../shared/types';
import { Button } from '../ui/Button';

interface AccountListProps {
  accounts: Account[];
  connectionStatus: Map<string, ConnectionStatus>;
  activeAccountId: string | null;
  onConnect: (account: Account) => void;
  onDisconnect: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onSelect: (accountId: string) => void;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  connectionStatus,
  activeAccountId,
  onConnect,
  onDisconnect,
  onDelete,
  onSelect,
}) => {
  const getStatusBadge = (accountId: string) => {
    const status = connectionStatus.get(accountId);

    switch (status) {
      case 'connected':
        return <span className="badge-success">Connected</span>;
      case 'connecting':
        return <span className="badge-warning">Connecting</span>;
      case 'qr_ready':
        return <span className="badge-info">QR Ready</span>;
      case 'logged_out':
        return <span className="badge-error">Logged Out</span>;
      default:
        return <span className="badge bg-gray-100 text-gray-600">Disconnected</span>;
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        <p className="mt-2">No accounts added yet</p>
        <p className="text-sm">Add an account to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const status = connectionStatus.get(account.id);
        const isActive = activeAccountId === account.id;
        const isConnected = status === 'connected';
        const isConnecting = status === 'connecting' || status === 'qr_ready';

        return (
          <div
            key={account.id}
            onClick={() => onSelect(account.id)}
            className={`
              card flex items-center justify-between cursor-pointer transition-all
              ${isActive ? 'ring-2 ring-whatsapp-light' : 'hover:shadow-md'}
            `}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold
                  ${isConnected ? 'bg-whatsapp-light' : 'bg-gray-400'}
                `}
              >
                {account.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div>
                <h3 className="font-medium text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500">
                  {account.phoneNumber || 'Phone not verified'}
                </p>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              {getStatusBadge(account.id)}

              {isConnected ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect(account.id);
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isConnecting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnect(account);
                  }}
                >
                  Connect
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(account.id);
                }}
                className="text-red-600 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
