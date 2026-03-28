'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { mockTenants, mockBeds, mockRooms, mockFloors, mockRentCycles, mockPayments, mockDepositInstallments } from '@/lib/mock-data'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import type { TenantWithBed, TenantStatus } from '@/types/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

type FilterTab = 'all' | 'active' | 'notice_period' | 'checked_out'

const statusBadge: Record<TenantStatus, { variant: 'green' | 'yellow' | 'gray'; key: 'active' | 'noticePeriod' | 'checkedOut' }> = {
  active: { variant: 'green', key: 'active' },
  notice_period: { variant: 'yellow', key: 'noticePeriod' },
  checked_out: { variant: 'gray', key: 'checkedOut' },
}

export default function TenantsPage() {
  const { t, ownerProfile, loading: appLoading } = useApp()

  // Build tenants with joined bed/room/floor data from mock data
  const tenantsWithBeds: TenantWithBed[] = useMemo(() => {
    return mockTenants.map((tenant) => {
      const bed = mockBeds.find((b) => b.id === tenant.bed_id)
      const room = bed ? mockRooms.find((r) => r.id === bed.room_id) : undefined
      const floor = room ? mockFloors.find((f) => f.id === room.floor_id) : undefined
      return {
        ...tenant,
        bed: bed
          ? {
              ...bed,
              room: room
                ? {
                    ...room,
                    floor: floor || undefined,
                  }
                : undefined,
            }
          : undefined,
      } as TenantWithBed
    })
  }, [])

  const [tenants] = useState<TenantWithBed[]>(tenantsWithBeds)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filteredTenants = useMemo(() => {
    let result = tenants

    if (activeTab !== 'all') {
      result = result.filter((t) => t.status === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q)
      )
    }

    return result
  }, [tenants, activeTab, search])

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: t('allTenants'), count: tenants.length },
    { key: 'active', label: t('active'), count: tenants.filter((t) => t.status === 'active').length },
    { key: 'notice_period', label: t('noticePeriod'), count: tenants.filter((t) => t.status === 'notice_period').length },
    { key: 'checked_out', label: t('checkedOut'), count: tenants.filter((t) => t.status === 'checked_out').length },
  ]

  if (appLoading) {
    return (
      <AppShell>
        <p className="text-center text-gray-500 py-10">{t('loading')}</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{t('tenants')}</h2>
        <Link href="/tenants/new">
          <Button size="sm">{t('addTenant')}</Button>
        </Link>
      </div>

      <Input
        placeholder={t('search') + '...'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filteredTenants.length === 0 ? (
        <p className="text-center text-gray-500 py-10">{t('noData')}</p>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => {
            const badge = statusBadge[tenant.status]
            const bed = tenant.bed
            const roomLabel = bed?.room
              ? `${bed.room.floor?.name || ''} / ${bed.room.name} / ${bed.label}`
              : '-'

            return (
              <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                <Card className="mb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {tenant.full_name}
                        </h3>
                        <Badge variant={badge.variant}>{t(badge.key)}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{tenant.phone}</p>
                      <p className="text-sm text-gray-500">{roomLabel}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-base font-bold text-gray-900">
                        {formatCurrency(tenant.monthly_rent)}
                      </p>
                      <p className="text-xs text-gray-400">{t('monthlyRent').replace(' (₹)', '')}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
