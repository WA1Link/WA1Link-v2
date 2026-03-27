export interface LicenseState {
  isValid: boolean;
  reason?: string;
  maxAccounts: number;
  expiresAt?: string;
  fingerprint?: string;
}

export interface LicensePayload {
  fingerprint: string;
  maxAccounts: number;
  expiresAt: string;
  signature: string;
}

export interface LicenseValidationResult {
  isValid: boolean;
  reason?: string;
  payload?: Omit<LicensePayload, 'signature'>;
}
