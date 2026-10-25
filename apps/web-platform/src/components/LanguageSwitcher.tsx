import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { i18n, Language } from '../i18n';

const languages = [
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'sw' as Language, name: 'Kiswahili', flag: '🇹🇿' },
];

const LanguageSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const currentLang = i18n.getLanguage();

  const handleLanguageChange = (langCode: Language) => {
    i18n.setLanguage(langCode);
    setIsOpen(false);
  };

  const current = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Globe size={18} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{current.flag}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${
                  currentLang === lang.code ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="text-left">
                  <div className={`text-sm font-medium ${
                    currentLang === lang.code ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {lang.name}
                  </div>
                  <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                </div>
                {currentLang === lang.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
