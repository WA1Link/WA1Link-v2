import {
  normalizePhone,
  validatePhone,
  toJID,
  fromJID,
  cleanPhoneNumber,
  NormalizedPhone,
  PhoneValidationResult,
} from '../../../shared/validation/phone.validation';
import { getCountryByDialCode, DEFAULT_COUNTRY_CODE } from '../../../shared/constants/countries';

export class PhoneNormalizerService {
  private defaultCountryCode: string;

  constructor(defaultCountryCode: string = DEFAULT_COUNTRY_CODE) {
    this.defaultCountryCode = defaultCountryCode;
  }

  /**
   * Set the default country code for normalization
   */
  setDefaultCountryCode(countryCode: string): void {
    if (getCountryByDialCode(countryCode)) {
      this.defaultCountryCode = countryCode;
    }
  }

  /**
   * Normalize a phone number to full international format
   */
  normalize(phone: string): NormalizedPhone | null {
    return normalizePhone(phone, this.defaultCountryCode);
  }

  /**
   * Validate a phone number with detailed result
   */
  validate(phone: string): PhoneValidationResult {
    return validatePhone(phone, this.defaultCountryCode);
  }

  /**
   * Convert phone number to WhatsApp JID
   */
  toJID(phone: string): string | null {
    return toJID(phone, this.defaultCountryCode);
  }

  /**
   * Extract phone number from JID
   */
  fromJID(jid: string): string {
    return fromJID(jid);
  }

  /**
   * Clean phone number (remove non-digits)
   */
  clean(phone: string): string {
    return cleanPhoneNumber(phone);
  }

  /**
   * Normalize a batch of phone numbers
   */
  normalizeBatch(phones: string[]): Array<{ original: string; normalized: NormalizedPhone | null }> {
    return phones.map((phone) => ({
      original: phone,
      normalized: this.normalize(phone),
    }));
  }

  /**
   * Validate a batch of phone numbers
   */
  validateBatch(phones: string[]): Array<{ original: string; result: PhoneValidationResult }> {
    return phones.map((phone) => ({
      original: phone,
      result: this.validate(phone),
    }));
  }
}

export const phoneNormalizer = new PhoneNormalizerService();
