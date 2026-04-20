import { parsePhoneNumberFromString, CountryCode, PhoneNumber } from 'libphonenumber-js';
import { COUNTRIES, CountryConfig, getCountryByDialCode } from '../constants/countries';

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  countryCode?: string;
  localNumber?: string;
  error?: string;
}

export interface NormalizedPhone {
  full: string;
  countryCode: string;
  localNumber: string;
  jid: string;
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function resolveDefaultIso(dialCode: string | undefined): CountryCode | undefined {
  if (!dialCode) return undefined;
  const match = getCountryByDialCode(dialCode);
  return match?.code as CountryCode | undefined;
}

function tryParse(phone: string, defaultIso?: CountryCode): PhoneNumber | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('+')) {
    const p = parsePhoneNumberFromString(trimmed);
    if (p) return p;
  }

  const cleaned = cleanPhoneNumber(trimmed);
  if (!cleaned) return undefined;

  // Treat as E.164 without leading +
  const withPlus = parsePhoneNumberFromString('+' + cleaned);
  if (withPlus && withPlus.isValid()) return withPlus;

  // Fall back to default country
  if (defaultIso) {
    const viaDefault = parsePhoneNumberFromString(trimmed, defaultIso);
    if (viaDefault && viaDefault.isValid()) return viaDefault;
    if (viaDefault && viaDefault.isPossible()) return viaDefault;
  }

  // Last resort: possible E.164-ish match
  return withPlus;
}

export function detectCountry(cleanedPhone: string): CountryConfig | undefined {
  const parsed = parsePhoneNumberFromString('+' + cleanedPhone);
  if (!parsed) return undefined;
  return COUNTRIES.find((c) => c.dialCode === parsed.countryCallingCode);
}

export function normalizePhone(
  phone: string,
  defaultCountryCode: string = '994'
): NormalizedPhone | null {
  if (!phone) return null;
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned || cleaned.length < 5) return null;

  const defaultIso = resolveDefaultIso(defaultCountryCode);
  const parsed = tryParse(phone, defaultIso);

  if (!parsed || !parsed.isPossible()) return null;

  const full = parsed.number.replace(/^\+/, '');
  return {
    full,
    countryCode: parsed.countryCallingCode,
    localNumber: parsed.nationalNumber,
    jid: `${full}@s.whatsapp.net`,
  };
}

export function validatePhone(
  phone: string,
  defaultCountryCode?: string
): PhoneValidationResult {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned) return { valid: false, error: 'Phone number is empty' };
  if (cleaned.length < 5) return { valid: false, error: 'Phone number is too short' };
  if (cleaned.length > 15) return { valid: false, error: 'Phone number is too long' };

  const defaultIso = resolveDefaultIso(defaultCountryCode ?? '994');
  const parsed = tryParse(phone, defaultIso);

  if (!parsed) return { valid: false, error: 'Could not parse phone number' };

  const normalized = parsed.number.replace(/^\+/, '');

  if (!parsed.isValid()) {
    return {
      valid: false,
      normalized,
      countryCode: parsed.countryCallingCode,
      localNumber: parsed.nationalNumber,
      error: 'Invalid phone number format',
    };
  }

  return {
    valid: true,
    normalized,
    countryCode: parsed.countryCallingCode,
    localNumber: parsed.nationalNumber,
  };
}

export function toJID(phone: string, defaultCountryCode?: string): string | null {
  const normalized = normalizePhone(phone, defaultCountryCode);
  return normalized?.jid ?? null;
}

export function fromJID(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
}

export function formatPhoneDisplay(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return phone;
  const parsed = parsePhoneNumberFromString('+' + cleaned);
  if (parsed) return parsed.formatInternational();
  return phone;
}
