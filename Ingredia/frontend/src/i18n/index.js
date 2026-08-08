import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'

const LANG_KEY = 'ingredia_lang'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: localStorage.getItem(LANG_KEY) || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export const setLanguage = (lang) => {
  i18n.changeLanguage(lang)
  try { localStorage.setItem(LANG_KEY, lang) } catch {}
}

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'हि', name: 'हिंदी' },
]

export default i18n
