'use client'

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { mockTenants, mockRentCycles, mockPayments } from '@/lib/mock-data'
import { formatCurrency, formatDate, toPaise, toRupees, monthLabel } from '@/lib/utils'
import type { Tenant, RentCycle, RentCycleWithPayments, Payment, PaymentMode } from '@/types/database'

export default function PaymentsPageWrapper() {
  return (
    <Suspense>
      <PaymentsPage />
    </Suspense>
  )
}

function PaymentsPage() {
  const { t, ownerProfile, loading: appLoading } = useApp()
  const searchParams = useSearchParams()

  const [tenants] = useState<Tenant[]>(() =>
    mockTenants
      .filter((t) => t.status === 'active' || t.status === 'notice_period')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [allPayments, setAllPayments] = useState<Payment[]>(() => [...mockPayments])
  const [allRentCycles, setAllRentCycles] = useState<RentCycle[]>(() => [...mockRentCycles])
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCycle, setModalCycle] = useState<RentCycleWithPayments | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('')
  const [lateFee, setLateFee] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-select from URL param
  useEffect(() => {
    const urlTenant = searchParams.get('tenant')
    if (urlTenant && tenants.some((t) => t.id === urlTenant)) {
      setSelectedTenantId(urlTenant)
    }
  }, [searchParams, tenants])

  // Derive rent cycles with payments for the selected tenant
  const rentCycles: RentCycleWithPayments[] = useMemo(() => {
    if (!selectedTenantId) return []

    const cycles = allRentCycles
      .filter((c) => c.tenant_id === selectedTenantId)
      .sort((a, b) => b.due_date.localeCompare(a.due_date))

    return cycles.map((cycle) => ({
      ...cycle,
      payments: allPayments
        .filter((p) => p.rent_cycle_id === cycle.id)
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    }))
  }, [selectedTenantId, allRentCycles, allPayments])

  function openPaymentModal(cycle: RentCycleWithPayments) {
    const remaining = cycle.amount_due - cycle.amount_paid
    setModalCycle(cycle)
    setPaymentAmount(String(toRupees(remaining)))
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMode('')
    setLateFee('')
    setPaymentNotes('')
    setModalOpen(true)
  }

  function handleSavePayment() {
    if (!modalCycle || !ownerProfile || !paymentMode) return

    const amountPaise = toPaise(parseFloat(paymentAmount) || 0)
    const lateFeePaise = toPaise(parseFloat(lateFee) || 0)

    if (amountPaise <= 0) return

    setSaving(true)

    const newPayment: Payment = {
      id: Math.random().toString(36).slice(2),
      rent_cycle_id: modalCycle.id,
      tenant_id: selectedTenantId,
      owner_id: ownerProfile.id,
      amount: amountPaise,
      mode: paymentMode,
      payment_date: paymentDate,
      late_fee: lateFeePaise,
      notes: paymentNotes || null,
      created_at: new Date().toISOString(),
    }

    setAllPayments((prev) => [...prev, newPayment])

    // Update rent cycle
    const newAmountPaid = modalCycle.amount_paid + amountPaise
    const newStatus: RentCycle['status'] =
      newAmountPaid >= modalCycle.amount_due ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'

    setAllRentCycles((prev) =>
      prev.map((c) =>
        c.id === modalCycle.id
          ? { ...c, amount_paid: newAmountPaid, status: newStatus }
          : c
      )
    )

    setSaving(false)
    setModalOpen(false)
    setModalCycle(null)
  }

  function statusBadgeVariant(status: RentCycle['status']): 'red' | 'yellow' | 'green' {
    if (status === 'paid') return 'green'
    if (status === 'partial') return 'yellow'
    return 'red'
  }

  const tenantOptions = [
    { value: '', label: `-- ${t('tenants')} --` },
    ...tenants.map((tn) => ({ value: tn.id, label: tn.full_name })),
  ]

  if (appLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500 text-lg font-semibold">{t('loading')}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-xl font-extrabold text-gray-900">{t('payments')}</h1>

        {/* Tenant Selector */}
        <Select
          label={t('tenants')}
          options={tenantOptions}
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
        />

        {/* Rent Cycles List */}
        {selectedTenantId && rentCycles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">{t('noData')}</p>
        )}

        {rentCycles.map((cycle) => {
          const balance = cycle.amount_due - cycle.amount_paid
          const isExpanded = expandedCycleId === cycle.id

          return (
            <Card key={cycle.id}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-900">
                  {monthLabel(cycle.cycle_month)}
                </h3>
                <Badge variant={statusBadgeVariant(cycle.status)}>
                  {t(cycle.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">{t('amountDue')}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(cycle.amount_due)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{t('amountPaid')}</p>
                  <p className="font-semibold text-green-600">{formatCurrency(cycle.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{t('balance')}</p>
                  <p className="font-semibold text-red-600">{formatCurrency(balance)}</p>
                </div>
              </div>

              {/* Record Payment button */}
              {cycle.status !== 'paid' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openPaymentModal(cycle)}
                  className="w-full mb-2"
                >
                  {t('recordPayment')}
                </Button>
              )}

              {/* Payment history toggle */}
              {cycle.payments.length > 0 && (
                <button
                  onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 w-full text-left"
                >
                  {t('paymentHistory')} ({cycle.payments.length})
                  <span className="ml-1">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </button>
              )}

              {/* Expanded payment list */}
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {cycle.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-gray-50 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.payment_date)}
                          {' \u2022 '}
                          <span className="uppercase">{t(payment.mode)}</span>
                        </p>
                        {payment.late_fee > 0 && (
                          <p className="text-xs text-red-500">
                            {t('lateFee')}: {formatCurrency(payment.late_fee)}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Record Payment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('recordPayment')}
      >
        <div className="space-y-4">
          {modalCycle && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-blue-800">
                {monthLabel(modalCycle.cycle_month)}
              </p>
              <p className="text-blue-600">
                {t('balance')}: {formatCurrency(modalCycle.amount_due - modalCycle.amount_paid)}
              </p>
            </div>
          )}

          <Input
            label={t('amount')}
            type="number"
            step="0.01"
            min="0"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />

          <Input
            label={t('paymentDate')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />

          {/* Payment Mode: Cash / Digital toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('paymentMode')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-3 px-4 rounded-xl text-base font-bold border-2 transition-all ${
                  paymentMode === 'cash'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {t('cash')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('digital')}
                className={`py-3 px-4 rounded-xl text-base font-bold border-2 transition-all ${
                  paymentMode === 'digital'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {t('digital')}
              </button>
            </div>
          </div>

          <Input
            label={t('lateFee')}
            type="number"
            step="0.01"
            min="0"
            value={lateFee}
            onChange={(e) => setLateFee(e.target.value)}
            placeholder="0"
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('notes')}
            </label>
            <textarea
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[80px]"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSavePayment}
            disabled={saving || !paymentMode || !paymentAmount}
          >
            {saving ? t('loading') : t('save')}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
