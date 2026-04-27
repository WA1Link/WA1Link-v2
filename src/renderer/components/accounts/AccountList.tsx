import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const getStatusBadge = (accountId: string) => {
    const status = connectionStatus.get(accountId);

    switch (status) {
      case 'connected':
        return <span className="badge-success">{t('accounts.status.connected')}</span>;
      case 'connecting':
        return <span className="badge-warning">{t('accounts.status.connecting')}</span>;
      case 'qr_ready':
        return <span className="badge-info">{t('accounts.status.qrReady')}</span>;
      case 'logged_out':
        return <span className="badge-error">{t('accounts.status.loggedOut')}</span>;
      default:
        return <span className="badge bg-gray-100 text-gray-600">{t('accounts.status.disconnected')}</span>;
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
        <p className="mt-2">{t('accounts.noAccountsYet')}</p>
        <p className="text-sm">{t('accounts.noAccountsHint')}</p>
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
                  {account.phoneNumber || t('accounts.phoneNotVerified')}
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
                  {t('accounts.disconnect')}
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
                  {t('accounts.connect')}
                </Button>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
};
