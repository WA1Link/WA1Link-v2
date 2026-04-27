import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountStore } from '../../stores/useAccountStore';
import { useUIStore } from '../../stores/useUIStore';
import { useLicenseStore } from '../../stores/useLicenseStore';
import { AccountList } from './AccountList';
import { AccountForm } from './AccountForm';
import { QRCodeModal } from './QRCodeModal';
import { Button } from '../ui/Button';
import { Account } from '../../../shared/types';

export const AccountManager: React.FC = () => {
  const { t } = useTranslation();
  const {
    accounts,
    connectionStatus,
    activeAccountId,
    qrCodes,
    pairingCodes,
    isLoading,
    fetchAccounts,
    createAccount,
    deleteAccount,
    connect,
    disconnect,
    setActiveAccount,
    updateConnectionStatus,
    setQRCode,
    setPairingCode,
    clearQRCode,
    clearPairingCode,
  } = useAccountStore();

  const { addToast } = useUIStore();
  const { canAddAccount } = useLicenseStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [connectingAccountId, setConnectingAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectingAccountIdRef = useRef<string | null>(null);

  useEffect(() => {
    connectingAccountIdRef.current = connectingAccountId;
  }, [connectingAccountId]);

  // Set up IPC listeners
  useEffect(() => {
    const unsubStatus = window.electronAPI.account.onStatusChanged((connection) => {
      updateConnectionStatus(connection);

      if (connection.status === 'connected') {
        setConnectingAccountId(null);
        setIsConnecting(false);
        clearQRCode(connection.accountId);
        clearPairingCode(connection.accountId);
        addToast({ type: 'success', message: t('accounts.connectedToast') });
      } else if (connection.status === 'logged_out') {
        setConnectingAccountId(null);
        setIsConnecting(false);
        clearQRCode(connection.accountId);
        clearPairingCode(connection.accountId);
        addToast({ type: 'error', message: t('accounts.loggedOutToast') });
      } else if (connection.status === 'disconnected' && connectingAccountIdRef.current === connection.accountId) {
        setIsConnecting(false);
      }
    });

    const unsubQR = window.electronAPI.account.onQRReceived((data) => {
      setQRCode(data.accountId, data.qrCode);
    });

    const unsubPairing = window.electronAPI.account.onPairingCodeReceived((data) => {
      setPairingCode(data.accountId, data.code);
    });

    return () => {
      unsubStatus();
      unsubQR();
      unsubPairing();
    };
  }, []);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = async (data: { name: string; countryCode: string }) => {
    try {
      await createAccount(data);
      setShowAddForm(false);
      addToast({ type: 'success', message: t('accounts.added') });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleOpenConnect = (account: Account) => {
    setConnectingAccountId(account.id);
  };

  const handleConnect = async (usePairingCode: boolean, phoneNumber?: string) => {
    if (!connectingAccountId) return;

    setIsConnecting(true);
    try {
      await connect(connectingAccountId, usePairingCode, phoneNumber);
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
      setIsConnecting(false);
    }
  };

  const handleCloseConnect = async () => {
    const accountId = connectingAccountId;
    setConnectingAccountId(null);
    setIsConnecting(false);
    if (accountId) {
      clearQRCode(accountId);
      clearPairingCode(accountId);
      // Stop the active connection attempt so the button spinner resets
      try {
        await disconnect(accountId);
      } catch {}
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnect(accountId);
      addToast({ type: 'info', message: t('accounts.disconnectedToast') });
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message });
    }
  };

  const handleDelete = async (accountId: string) => {
    if (confirm(t('accounts.deleteConfirm'))) {
      try {
        await deleteAccount(accountId);
        addToast({ type: 'success', message: t('accounts.deleted') });
      } catch (error) {
        addToast({ type: 'error', message: (error as Error).message });
      }
    }
  };

  const connectingAccount = connectingAccountId
    ? accounts.find((a) => a.id === connectingAccountId)
    : null;

  const currentQR = connectingAccountId ? qrCodes.get(connectingAccountId) : null;
  const currentPairingCode = connectingAccountId
    ? pairingCodes.get(connectingAccountId)
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('accounts.managerTitle')}</h2>
          <p className="text-sm text-gray-500">{t('accounts.managerDescription')}</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={!canAddAccount(accounts.length)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          {t('accounts.addAccount')}
        </Button>
      </div>

      <AccountList
        accounts={accounts}
        connectionStatus={connectionStatus}
        activeAccountId={activeAccountId}
        onConnect={handleOpenConnect}
        onDisconnect={handleDisconnect}
        onDelete={handleDelete}
        onSelect={setActiveAccount}
      />

      <AccountForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleAddAccount}
        isLoading={isLoading}
      />

      <QRCodeModal
        isOpen={!!connectingAccountId}
        onClose={handleCloseConnect}
        qrCode={currentQR ?? null}
        pairingCode={currentPairingCode ?? null}
        accountName={connectingAccount?.name || 'Account'}
        defaultCountryCode={connectingAccount?.countryCode || '994'}
        onConnect={handleConnect}
        isConnecting={isConnecting}
      />
    </div>
  );
};
