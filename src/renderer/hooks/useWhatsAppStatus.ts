import { useEffect } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { AccountConnection } from '../../shared/types';

/**
 * Hook to manage WhatsApp connection status listeners
 */
export function useWhatsAppStatus() {
  const {
    updateConnectionStatus,
    setQRCode,
    setPairingCode,
    clearQRCode,
    clearPairingCode,
  } = useAccountStore();

  useEffect(() => {
    // Status changes
    const unsubStatus = window.electronAPI.account.onStatusChanged(
      (connection: AccountConnection) => {
        updateConnectionStatus(connection);

        // Clear QR/pairing codes on successful connection
        if (connection.status === 'connected') {
          clearQRCode(connection.accountId);
          clearPairingCode(connection.accountId);
        }
      }
    );

    // QR codes
    const unsubQR = window.electronAPI.account.onQRReceived(
      (data: { accountId: string; qrCode: string }) => {
        setQRCode(data.accountId, data.qrCode);
      }
    );

    // Pairing codes
    const unsubPairing = window.electronAPI.account.onPairingCodeReceived(
      (data: { accountId: string; code: string }) => {
        setPairingCode(data.accountId, data.code);
      }
    );

    return () => {
      unsubStatus();
      unsubQR();
      unsubPairing();
    };
  }, [
    updateConnectionStatus,
    setQRCode,
    setPairingCode,
    clearQRCode,
    clearPairingCode,
  ]);
}
