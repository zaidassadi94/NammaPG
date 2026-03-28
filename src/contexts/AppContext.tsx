'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Language, t, TranslationKey } from '@/lib/translations'
import type { OwnerProfile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

interface AppContextType {
  user: User | null
  ownerProfile: OwnerProfile | null
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  refreshProfile: () => Promise<void>
  loading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null)
  const [language, setLanguageState] = useState<Language>('en')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('nammapg_lang', lang)
  }

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('owner_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setOwnerProfile(data)
        setLanguageState(data.language || 'en')
      }
    }
  }

  useEffect(() => {
    const savedLang = localStorage.getItem('nammapg_lang') as Language
    if (savedLang) setLanguageState(savedLang)

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await refreshProfile()
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await refreshProfile()
        } else {
          setOwnerProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppContext.Provider
      value={{
        user,
        ownerProfile,
        language,
        setLanguage,
        t: (key: TranslationKey) => t(language, key),
        refreshProfile,
        loading,
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
