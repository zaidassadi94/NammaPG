'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase-browser'
import { formatCurrency, isOverdue, formatDate } from '@/lib/utils'
import type { Tenant, RentCycle, BedStatus } from '@/types/database'

interface BedCounts {
  total: number
  occupied: number
  empty: number
  blocked: number
  notice_period: number
}

interface OverdueTenant {
  tenant: Tenant
  roomName: string
  amountOverdue: number
}

interface NoticeTenant {
  tenant: Tenant
  roomName: string
}

export default function DashboardPage() {
  const { t, ownerProfile, loading: appLoading } = useApp()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [bedCounts, setBedCounts] = useState<BedCounts>({
    total: 0,
    occupied: 0,
    empty: 0,
    blocked: 0,
    notice_period: 0,
  })
  const [totalDue, setTotalDue] = useState(0)
  const [totalCollected, setTotalCollected] = useState(0)
  const [overdueTenants, setOverdueTenants] = useState<OverdueTenant[]>([])
  const [noticeTenants, setNoticeTenants] = useState<NoticeTenant[]>([])

  useEffect(() => {
    if (!ownerProfile) return

    async function fetchDashboardData() {
      setLoading(true)
      const ownerId = ownerProfile!.id

      // Fetch all beds for occupancy counts
      const { data: beds } = await supabase
        .from('beds')
        .select('id, status')
        .eq('owner_id', ownerId)

      if (beds) {
        const counts: BedCounts = {
          total: beds.length,
          occupied: 0,
          empty: 0,
          blocked: 0,
          notice_period: 0,
        }
        beds.forEach((bed) => {
          const status = bed.status as BedStatus
          if (status === 'occupied') counts.occupied++
          else if (status === 'empty') counts.empty++
          else if (status === 'blocked') counts.blocked++
          else if (status === 'notice_period') counts.notice_period++
        })
        setBedCounts(counts)
      }

      // Fetch current month rent cycles
      const now = new Date()
      const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const { data: rentCycles } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('cycle_month', cycleMonth)

      if (rentCycles) {
        const due = rentCycles.reduce((sum: number, rc: RentCycle) => sum + rc.amount_due, 0)
        const collected = rentCycles.reduce((sum: number, rc: RentCycle) => sum + rc.amount_paid, 0)
        setTotalDue(due)
        setTotalCollected(collected)
      }

      // Fetch overdue tenants: active tenants with unpaid rent cycles where due_date > 5 days ago
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0]

      const { data: overdueRentCycles } = await supabase
        .from('rent_cycles')
        .select('tenant_id, amount_due, amount_paid, due_date')
        .eq('owner_id', ownerId)
        .neq('status', 'paid')
        .lt('due_date', fiveDaysAgoStr)

      if (overdueRentCycles && overdueRentCycles.length > 0) {
        // Get unique tenant IDs from overdue cycles
        const tenantIds = [...new Set(overdueRentCycles.map((rc) => rc.tenant_id))]

        const { data: tenants } = await supabase
          .from('tenants')
          .select('*, bed:beds(*, room:rooms(*))')
          .eq('owner_id', ownerId)
          .eq('status', 'active')
          .in('id', tenantIds)

        if (tenants) {
          const overdueList: OverdueTenant[] = tenants.map((tenant: any) => {
            const tenantCycles = overdueRentCycles.filter(
              (rc) => rc.tenant_id === tenant.id
            )
            const amountOverdue = tenantCycles.reduce(
              (sum, rc) => sum + (rc.amount_due - rc.amount_paid),
              0
            )
            const bed = tenant.bed
            const roomName = bed?.room?.name || '-'
            return { tenant, roomName, amountOverdue }
          })
          setOverdueTenants(overdueList.filter((t) => t.amountOverdue > 0))
        }
      } else {
        setOverdueTenants([])
      }

      // Fetch notice period tenants
      const { data: noticeTenantsData } = await supabase
        .from('tenants')
        .select('*, bed:beds(*, room:rooms(*))')
        .eq('owner_id', ownerId)
        .eq('status', 'notice_period')

      if (noticeTenantsData) {
        const noticeList: NoticeTenant[] = noticeTenantsData.map((tenant: any) => {
          const bed = tenant.bed
          const roomName = bed?.room?.name || '-'
          return { tenant, roomName }
        })
        setNoticeTenants(noticeList)
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [ownerProfile])

  if (appLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500 text-lg font-semibold">{t('loading')}</p>
        </div>
      </AppShell>
    )
  }

  const occupancyPercent =
    bedCounts.total > 0 ? Math.round((bedCounts.occupied / bedCounts.total) * 100) : 0
  const collectionPercent =
    totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0

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
              <span className="text-green-600">
                {bedCounts.occupied} {t('occupiedBeds')}
              </span>
              <span className="text-gray-400">
                {bedCounts.empty} {t('emptyBeds')}
              </span>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
            {bedCounts.total > 0 && (
              <>
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(bedCounts.occupied / bedCounts.total) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-yellow-400 transition-all duration-500"
                  style={{
                    width: `${(bedCounts.notice_period / bedCounts.total) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-red-300 transition-all duration-500"
                  style={{
                    width: `${(bedCounts.blocked / bedCounts.total) * 100}%`,
                  }}
                />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              {t('occupied')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              {t('noticePeriod')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" />
              {t('blocked')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
              {t('empty')}
            </span>
          </div>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {t('rentDue')}
            </p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">
              {formatCurrency(totalDue)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {t('rentCollected')}
            </p>
            <p className="text-xl font-extrabold text-green-600 mt-1">
              {formatCurrency(totalCollected)}
            </p>
            {totalDue > 0 && (
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(collectionPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{collectionPercent}%</p>
              </div>
            )}
          </Card>
        </div>

        {/* Overdue Tenants */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('overdueTenants')}
          </h2>
          {overdueTenants.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {overdueTenants.map(({ tenant, roomName, amountOverdue }) => (
                <li key={tenant.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {tenant.full_name}
                    </Link>
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
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('noticeTenants')}
          </h2>
          {noticeTenants.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noData')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {noticeTenants.map(({ tenant, roomName }) => (
                <li key={tenant.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {tenant.full_name}
                    </Link>
                    <p className="text-xs text-gray-400">{roomName}</p>
                  </div>
                  <Badge variant="yellow">
                    {tenant.expected_checkout_date
                      ? formatDate(tenant.expected_checkout_date)
                      : '-'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('quickActions')}
          </h2>
          <div className="flex flex-col gap-2">
            <Link href="/tenants/new">
              <Button variant="primary" size="lg">
                {t('addTenant')}
              </Button>
            </Link>
            <Link href="/payments">
              <Button variant="secondary" size="lg">
                {t('recordPayment')}
              </Button>
            </Link>
            <Link href="/maintenance/new">
              <Button variant="secondary" size="lg">
                {t('logIssue')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
