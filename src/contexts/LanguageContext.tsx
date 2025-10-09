import React, { createContext, useContext, ReactNode } from 'react'
import { enUS, TranslationKeys } from '@/locales/en-US'

interface LanguageContextType {
  t: TranslationKeys
  language: string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // English only for now, but can be extended later
  const value = {
    t: enUS,
    language: 'en-US',
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

