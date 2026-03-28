'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', labelKey: 'dashboard' as const, icon: '🏠' },
  { href: '/property', labelKey: 'property' as const, icon: '🏢' },
  { href: '/tenants', labelKey: 'tenants' as const, icon: '👥' },
  { href: '/maintenance', labelKey: 'maintenance' as const, icon: '🔧' },
  { href: '/settings', labelKey: 'settings' as const, icon: '⚙️' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { t } = useApp()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-blue-700">NammaPG</h1>
          <Link
            href="/reports"
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
              pathname.startsWith('/reports')
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {t('reports')}
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-colors min-h-[56px] justify-center',
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
