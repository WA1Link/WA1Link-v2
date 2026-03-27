import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { COUNTRIES } from '../../../shared/constants/countries';

type ConnectionMethod = 'qr' | 'pairing';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  pairingCode: string | null;
  accountName: string;
  defaultCountryCode?: string;
  onConnect: (usePairingCode: boolean, phoneNumber?: string) => void;
  isConnecting?: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrCode,
  pairingCode,
  accountName,
  defaultCountryCode = '994',
  onConnect,
  isConnecting = false,
}) => {
  const [method, setMethod] = useState<ConnectionMethod>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [hasStarted, setHasStarted] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.dialCode,
    label: `+${c.dialCode} ${c.name}`,
  }));

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMethod('qr');
      setPhoneNumber('');
      setCountryCode(defaultCountryCode);
      setHasStarted(false);
    }
  }, [isOpen, defaultCountryCode]);

  // Focus phone input when pairing method is selected
  useEffect(() => {
    if (method === 'pairing' && !hasStarted && phoneInputRef.current) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [method, hasStarted]);

  const handleStartConnection = () => {
    setHasStarted(true);
    if (method === 'pairing') {
      const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      onConnect(true, fullNumber);
    } else {
      onConnect(false);
    }
  };

  const handleClose = () => {
    setHasStarted(false);
    onClose();
  };

  // Show method selection if not started
  if (!hasStarted) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={`Connect ${accountName}`} size="md">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Connection Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('qr')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  method === 'qr'
                    ? 'border-whatsapp-light bg-whatsapp-light bg-opacity-10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <span className="font-medium text-gray-900">QR Code</span>
                <p className="text-xs text-gray-500 mt-1">Scan with phone</p>
              </button>

              <button
                type="button"
                onClick={() => setMethod('pairing')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  method === 'pairing'
                    ? 'border-whatsapp-light bg-whatsapp-light bg-opacity-10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-gray-900">Pairing Code</span>
                <p className="text-xs text-gray-500 mt-1">Enter phone number</p>
              </button>
            </div>
          </div>

          {method === 'pairing' && (
            <div className="space-y-4">
              <Dropdown
                label="Country"
                options={countryOptions}
                value={countryCode}
                onChange={setCountryCode}
              />

              <Input
                ref={phoneInputRef}
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                leftAddon={`+${countryCode}`}
                autoFocus
              />

              <p className="text-xs text-gray-500">
                Enter the phone number registered with WhatsApp
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleStartConnection}
              disabled={method === 'pairing' && !phoneNumber.trim()}
              isLoading={isConnecting}
            >
              {method === 'qr' ? 'Show QR Code' : 'Get Pairing Code'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show QR code or pairing code
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Connect ${accountName}`} size="md">
      <div className="text-center">
        {qrCode && !pairingCode && (
          <>
            <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-sm border">
              <QRCodeSVG value={qrCode} size={200} level="M" />
            </div>
            <p className="text-gray-600 mb-2">Scan this QR code with WhatsApp</p>
            <ol className="text-sm text-gray-500 text-left max-w-xs mx-auto space-y-1">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Tap Menu or Settings and select Linked Devices</li>
              <li>3. Tap on Link a Device</li>
              <li>4. Point your phone at this screen to capture the QR code</li>
            </ol>
          </>
        )}

        {pairingCode && (
          <>
            <div className="bg-gray-100 rounded-xl p-6 mb-4">
              <p className="text-3xl font-mono font-bold tracking-wider text-gray-900">
                {pairingCode}
              </p>
            </div>
            <p className="text-gray-600 mb-2">Enter this code in WhatsApp</p>
            <ol className="text-sm text-gray-500 text-left max-w-xs mx-auto space-y-1">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Tap Menu or Settings and select Linked Devices</li>
              <li>3. Tap on Link a Device</li>
              <li>4. Tap "Link with phone number instead"</li>
              <li>5. Enter your phone number and the code above</li>
            </ol>
          </>
        )}

        {!qrCode && !pairingCode && (
          <div className="py-8">
            <svg
              className="animate-spin h-8 w-8 text-whatsapp-light mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="mt-4 text-gray-600">
              {method === 'qr' ? 'Waiting for QR code...' : 'Requesting pairing code...'}
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
