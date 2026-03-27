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

/**
 * Clean phone number by removing all non-digit characters
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Detect country from phone number
 */
export function detectCountry(cleanedPhone: string): CountryConfig | undefined {
  // Sort by dial code length descending (longer codes first for accurate matching)
  const sortedCountries = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sortedCountries) {
    if (cleanedPhone.startsWith(country.dialCode)) {
      const localNumber = cleanedPhone.slice(country.dialCode.length);
      if (country.localLength.includes(localNumber.length)) {
        return country;
      }
    }
  }

  return undefined;
}

/**
 * Normalize phone number to full international format
 */
export function normalizePhone(
  phone: string,
  defaultCountryCode: string = '994'
): NormalizedPhone | null {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned || cleaned.length < 5) {
    return null;
  }

  // Check if already has country code
  const detectedCountry = detectCountry(cleaned);

  if (detectedCountry) {
    const localNumber = cleaned.slice(detectedCountry.dialCode.length);
    return {
      full: cleaned,
      countryCode: detectedCountry.dialCode,
      localNumber,
      jid: `${cleaned}@s.whatsapp.net`,
    };
  }

  // Apply default country code
  const country = getCountryByDialCode(defaultCountryCode);
  if (!country) {
    return null;
  }

  // Remove leading zero if present (common in local numbers)
  let localNumber = cleaned;
  if (localNumber.startsWith('0')) {
    localNumber = localNumber.slice(1);
  }

  // Validate local number length
  if (!country.localLength.includes(localNumber.length)) {
    return null;
  }

  const full = `${country.dialCode}${localNumber}`;

  return {
    full,
    countryCode: country.dialCode,
    localNumber,
    jid: `${full}@s.whatsapp.net`,
  };
}

/**
 * Validate phone number with detailed result
 */
export function validatePhone(
  phone: string,
  defaultCountryCode?: string
): PhoneValidationResult {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned) {
    return { valid: false, error: 'Phone number is empty' };
  }

  if (cleaned.length < 5) {
    return { valid: false, error: 'Phone number is too short' };
  }

  if (cleaned.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  const normalized = normalizePhone(phone, defaultCountryCode);

  if (!normalized) {
    return { valid: false, error: 'Could not normalize phone number' };
  }

  // Try to validate against country pattern
  const country = getCountryByDialCode(normalized.countryCode);
  if (country && country.pattern) {
    if (!country.pattern.test(normalized.localNumber)) {
      return {
        valid: false,
        normalized: normalized.full,
        countryCode: normalized.countryCode,
        localNumber: normalized.localNumber,
        error: `Invalid format for ${country.name}`,
      };
    }
  }

  return {
    valid: true,
    normalized: normalized.full,
    countryCode: normalized.countryCode,
    localNumber: normalized.localNumber,
  };
}

/**
 * Convert phone number to WhatsApp JID format
 */
export function toJID(phone: string, defaultCountryCode?: string): string | null {
  const normalized = normalizePhone(phone, defaultCountryCode);
  return normalized?.jid ?? null;
}

/**
 * Extract phone number from WhatsApp JID
 */
export function fromJID(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;

  const country = getCountryByDialCode(normalized.countryCode);
  if (!country) return `+${normalized.full}`;

  return `+${normalized.countryCode} ${normalized.localNumber}`;
}
