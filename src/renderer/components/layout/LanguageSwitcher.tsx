import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguageCode } from '../../i18n';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const currentCode = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguageCode;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLanguageCode;
    i18n.changeLanguage(next);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">{t('language.switcher')}</span>
      <svg
        className="w-4 h-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <select
        value={currentCode}
        onChange={handleChange}
        className="min-w-[150px] bg-transparent border border-gray-200 rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-light focus:border-transparent cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native}
          </option>
        ))}
      </select>
    </label>
  );
};
