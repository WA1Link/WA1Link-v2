export interface CountryConfig {
  code: string;
  name: string;
  dialCode: string;
  pattern: RegExp;
  localLength: number[];
  example: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'AZ',
    name: 'Azerbaijan',
    dialCode: '994',
    pattern: /^(50|51|55|70|77|99)\d{7}$/,
    localLength: [9],
    example: '501234567',
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '1',
    pattern: /^[2-9]\d{2}[2-9]\d{6}$/,
    localLength: [10],
    example: '2025551234',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '44',
    pattern: /^7\d{9}$/,
    localLength: [10],
    example: '7911123456',
  },
  {
    code: 'TR',
    name: 'Turkey',
    dialCode: '90',
    pattern: /^5\d{9}$/,
    localLength: [10],
    example: '5321234567',
  },
  {
    code: 'RU',
    name: 'Russia',
    dialCode: '7',
    pattern: /^9\d{9}$/,
    localLength: [10],
    example: '9123456789',
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '49',
    pattern: /^1[5-7]\d{8,9}$/,
    localLength: [10, 11],
    example: '15123456789',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '33',
    pattern: /^[67]\d{8}$/,
    localLength: [9],
    example: '612345678',
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '39',
    pattern: /^3\d{9}$/,
    localLength: [10],
    example: '3123456789',
  },
  {
    code: 'ES',
    name: 'Spain',
    dialCode: '34',
    pattern: /^[67]\d{8}$/,
    localLength: [9],
    example: '612345678',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '971',
    pattern: /^5[024568]\d{7}$/,
    localLength: [9],
    example: '501234567',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '966',
    pattern: /^5\d{8}$/,
    localLength: [9],
    example: '512345678',
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '91',
    pattern: /^[6-9]\d{9}$/,
    localLength: [10],
    example: '9123456789',
  },
  {
    code: 'PK',
    name: 'Pakistan',
    dialCode: '92',
    pattern: /^3\d{9}$/,
    localLength: [10],
    example: '3001234567',
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    dialCode: '880',
    pattern: /^1[3-9]\d{8}$/,
    localLength: [10],
    example: '1712345678',
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '55',
    pattern: /^[1-9][1-9]9?\d{8}$/,
    localLength: [10, 11],
    example: '11987654321',
  },
  {
    code: 'MX',
    name: 'Mexico',
    dialCode: '52',
    pattern: /^[1-9]\d{9}$/,
    localLength: [10],
    example: '5512345678',
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '234',
    pattern: /^[789]\d{9}$/,
    localLength: [10],
    example: '8012345678',
  },
  {
    code: 'EG',
    name: 'Egypt',
    dialCode: '20',
    pattern: /^1[0125]\d{8}$/,
    localLength: [10],
    example: '1012345678',
  },
  {
    code: 'KE',
    name: 'Kenya',
    dialCode: '254',
    pattern: /^7\d{8}$/,
    localLength: [9],
    example: '712345678',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '27',
    pattern: /^[6-8]\d{8}$/,
    localLength: [9],
    example: '712345678',
  },
];

export const DEFAULT_COUNTRY_CODE = '994'; // Azerbaijan

export function getCountryByCode(code: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCountryByDialCode(dialCode: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.dialCode === dialCode);
}

export function getAllCountries(): CountryConfig[] {
  return COUNTRIES;
}
