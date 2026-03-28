'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { mockBeds, mockTenants, mockRentCycles, mockRooms } from '@/lib/mock-data'
import type { BedStatus } from '@/types/database'

export default function DashboardPage() {
  const { t } = useApp()

  const bedCounts = useMemo(() => {
    const counts = { total: mockBeds.length, occupied: 0, empty: 0, blocked: 0, notice_period: 0 }
    mockBeds.forEach((bed) => {
      const s = bed.status as BedStatus
      if (s === 'occupied') counts.occupied++
      else if (s === 'empty') counts.empty++
      else if (s === 'blocked') counts.blocked++
      else if (s === 'notice_period') counts.notice_period++
    })
    return counts
  }, [])

  const { totalDue, totalCollected } = useMemo(() => {
    const now = new Date()
    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentCycles = mockRentCycles.filter((rc) => rc.cycle_month === cycleMonth)
    return {
      totalDue: currentCycles.reduce((s, rc) => s + rc.amount_due, 0),
      totalCollected: currentCycles.reduce((s, rc) => s + rc.amount_paid, 0),
    }
  }, [])

  const overdueTenants = useMemo(() => {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const overdueCycles = mockRentCycles.filter(
      (rc) => rc.status !== 'paid' && new Date(rc.due_date) < fiveDaysAgo
    )
    const tenantIds = [...new Set(overdueCycles.map((rc) => rc.tenant_id))]
    return tenantIds
      .map((tid) => {
        const tenant = mockTenants.find((t) => t.id === tid && t.status === 'active')
        if (!tenant) return null
        const cycles = overdueCycles.filter((rc) => rc.tenant_id === tid)
        const amountOverdue = cycles.reduce((s, rc) => s + (rc.amount_due - rc.amount_paid), 0)
        const bed = mockBeds.find((b) => b.id === tenant.bed_id)
        const room = bed ? mockRooms.find((r) => r.id === bed.room_id) : null
        return { tenant, roomName: room?.name || '-', amountOverdue }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.amountOverdue > 0)
  }, [])

  const noticeTenants = useMemo(() => {
    return mockTenants
      .filter((t) => t.status === 'notice_period')
      .map((tenant) => {
        const bed = mockBeds.find((b) => b.id === tenant.bed_id)
        const room = bed ? mockRooms.find((r) => r.id === bed.room_id) : null
        return { tenant, roomName: room?.name || '-' }
      })
  }, [])

  const collectionPercent = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Occupancy Bar */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('totalBeds')}
          </h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-extrabold text-gray-900">{bedCounts.total}</span>
            <div className="flex gap-3 text-sm font-semibold">
              <span className="text-green-600">{bedCounts.occupied} {t('occupiedBeds')}</span>
              <span className="text-gray-400">{bedCounts.empty} {t('emptyBeds')}</span>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
            {bedCounts.total > 0 && (
              <>
                <div className="h-full bg-green-500" style={{ width: `${(bedCounts.occupied / bedCounts.total) * 100}%` }} />
                <div className="h-full bg-yellow-400" style={{ width: `${(bedCounts.notice_period / bedCounts.total) * 100}%` }} />
                <div className="h-full bg-red-300" style={{ width: `${(bedCounts.blocked / bedCounts.total) * 100}%` }} />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{t('occupied')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />{t('noticePeriod')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" />{t('blocked')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />{t('empty')}</span>
          </div>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('rentDue')}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{formatCurrency(totalDue)}</p>
          </Card>
          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('rentCollected')}</p>
            <p className="text-xl font-extrabold text-green-600 mt-1">{formatCurrency(totalCollected)}</p>
            {totalDue > 0 && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(collectionPercent, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{collectionPercent}%</p>
              </div>
            )}
          </Card>
        </div>

        {/* Overdue Tenants */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('overdueTenants')}</h2>
          {overdueTenants.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {overdueTenants.map(({ tenant, roomName, amountOverdue }) => (
                <li key={tenant.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link href={`/tenants/${tenant.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">{tenant.full_name}</Link>
                    <p className="text-xs text-gray-400">{roomName}</p>
                  </div>
                  <Badge variant="red">{formatCurrency(amountOverdue)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notice Period Tenants */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('noticeTenants')}</h2>
          {noticeTenants.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {noticeTenants.map(({ tenant, roomName }) => (
                <li key={tenant.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link href={`/tenants/${tenant.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">{tenant.full_name}</Link>
                    <p className="text-xs text-gray-400">{roomName}</p>
                  </div>
                  <Badge variant="yellow">{tenant.expected_checkout_date ? formatDate(tenant.expected_checkout_date) : '-'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{t('quickActions')}</h2>
          <div className="flex flex-col gap-2">
            <Link href="/tenants/new"><Button variant="primary" size="lg">{t('addTenant')}</Button></Link>
            <Link href="/payments"><Button variant="secondary" size="lg">{t('recordPayment')}</Button></Link>
            <Link href="/maintenance/new"><Button variant="secondary" size="lg">{t('logIssue')}</Button></Link>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
