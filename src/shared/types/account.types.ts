export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_ready'
  | 'connected'
  | 'logged_out';

export interface Account {
  id: string;
  name: string;
  phoneNumber: string | null;
  countryCode: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AccountConnection {
  accountId: string;
  status: ConnectionStatus;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}

export interface CreateAccountInput {
  name: string;
  countryCode?: string;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  phoneNumber?: string;
  countryCode?: string;
  isVerified?: boolean;
}
