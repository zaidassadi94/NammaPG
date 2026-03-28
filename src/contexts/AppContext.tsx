'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Language, t, TranslationKey } from '@/lib/translations'
import { mockOwnerProfile } from '@/lib/mock-data'
import type { OwnerProfile } from '@/types/database'

interface AppContextType {
  user: { id: string } | null
  ownerProfile: OwnerProfile | null
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  refreshProfile: () => Promise<void>
  loading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(mockOwnerProfile)
  const [language, setLanguageState] = useState<Language>('en')

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nammapg_lang', lang)
    }
    setOwnerProfile((prev) => ({ ...prev, language: lang }))
  }

  const refreshProfile = async () => {
    // No-op in mock mode
  }

  return (
    <AppContext.Provider
      value={{
        user: { id: 'mock-user-001' },
        ownerProfile,
        language,
        setLanguage,
        t: (key: TranslationKey) => t(language, key),
        refreshProfile,
        loading: false,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
