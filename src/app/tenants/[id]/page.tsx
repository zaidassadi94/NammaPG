'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { mockTenants, mockBeds, mockRooms, mockFloors, mockRentCycles, mockPayments, mockDepositInstallments } from '@/lib/mock-data'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  formatCurrency,
  formatDate,
  maskAadhaar,
  toRupees,
  toPaise,
  monthLabel,
} from '@/lib/utils'
import type {
  Tenant,
  RentCycle,
  Payment,
  DepositInstallment,
  Settlement,
  Bed,
  Room,
  Floor,
} from '@/types/database'

type PaymentMode = 'cash' | 'digital'

interface TenantFull extends Tenant {
  bed?: Bed & { room?: Room & { floor?: Floor } }
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, ownerProfile } = useApp()

  // Build tenant with joined bed/room/floor data
  const initialTenant: TenantFull | null = useMemo(() => {
    const raw = mockTenants.find((t) => t.id === id)
    if (!raw) return null
    const bed = mockBeds.find((b) => b.id === raw.bed_id)
    const room = bed ? mockRooms.find((r) => r.id === bed.room_id) : undefined
    const floor = room ? mockFloors.find((f) => f.id === room.floor_id) : undefined
    return {
      ...raw,
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
    }
  }, [id])

  // Build rent cycles with nested payments
  const initialCycles = useMemo(() => {
    const cycles = mockRentCycles
      .filter((rc) => rc.tenant_id === id)
      .sort((a, b) => (b.due_date > a.due_date ? 1 : -1))
    return cycles.map((cycle) => ({
      ...cycle,
      payments: mockPayments.filter((p) => p.rent_cycle_id === cycle.id),
    }))
  }, [id])

  const initialDeposits = useMemo(() => {
    return mockDepositInstallments
      .filter((d) => d.tenant_id === id)
      .sort((a, b) => (b.payment_date > a.payment_date ? 1 : -1))
  }, [id])

  const [tenant, setTenant] = useState<TenantFull | null>(initialTenant)
  const [rentCycles, setRentCycles] = useState<(RentCycle & { payments: Payment[] })[]>(initialCycles)
  const [deposits, setDeposits] = useState<DepositInstallment[]>(initialDeposits)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [loading] = useState(false)

  // Modals
  const [paymentModal, setPaymentModal] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<RentCycle | null>(null)
  const [depositModal, setDepositModal] = useState(false)
  const [noticeConfirm, setNoticeConfirm] = useState(false)
  const [checkoutConfirm, setCheckoutConfirm] = useState(false)
  const [settlementModal, setSettlementModal] = useState(false)

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMode, setPayMode] = useState<PaymentMode>('digital')
  const [payLateFee, setPayLateFee] = useState('')
  const [payNotes, setPayNotes] = useState('')

  // Deposit form
  const [depAmount, setDepAmount] = useState('')
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0])
  const [depMode, setDepMode] = useState<PaymentMode>('digital')
  const [depNotes, setDepNotes] = useState('')

  // Settlement form
  const [damagesAmount, setDamagesAmount] = useState('')
  const [damagesNotes, setDamagesNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'deposits'>('profile')

  const totalDepositCollected = deposits.reduce((sum, d) => sum + d.amount, 0)
  const depositBalance = (tenant?.security_deposit || 0) - totalDepositCollected
  const totalUnpaidRent = rentCycles
    .filter((c) => c.status !== 'paid')
    .reduce((sum, c) => sum + (c.amount_due - c.amount_paid), 0)

  // Record Payment
  function openPaymentModal(cycle: RentCycle) {
    setSelectedCycle(cycle)
    const remaining = cycle.amount_due - cycle.amount_paid
    setPayAmount(String(toRupees(remaining)))
    setPayDate(new Date().toISOString().split('T')[0])
    setPayMode('digital')
    setPayLateFee('')
    setPayNotes('')
    setPaymentModal(true)
  }

  function handleRecordPayment() {
    if (!selectedCycle || !tenant || !ownerProfile || !payAmount) return
    setSaving(true)

    const amountPaise = toPaise(parseFloat(payAmount))
    const lateFeePaise = payLateFee ? toPaise(parseFloat(payLateFee)) : 0

    const newPayment: Payment = {
      id: Math.random().toString(36).slice(2),
      rent_cycle_id: selectedCycle.id,
      tenant_id: tenant.id,
      owner_id: ownerProfile.id,
      amount: amountPaise,
      mode: payMode,
      payment_date: payDate,
      late_fee: lateFeePaise,
      notes: payNotes || null,
      created_at: new Date().toISOString(),
    }

    const newPaid = selectedCycle.amount_paid + amountPaise
    const newStatus =
      newPaid >= selectedCycle.amount_due ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

    setRentCycles((prev) =>
      prev.map((c) =>
        c.id === selectedCycle.id
          ? { ...c, amount_paid: newPaid, status: newStatus as RentCycle['status'], payments: [...c.payments, newPayment] }
          : c
      )
    )

    setPaymentModal(false)
    setSaving(false)
  }

  // Deposit Installment
  function handleAddDeposit() {
    if (!tenant || !ownerProfile || !depAmount) return
    setSaving(true)

    const newDeposit: DepositInstallment = {
      id: Math.random().toString(36).slice(2),
      tenant_id: tenant.id,
      owner_id: ownerProfile.id,
      amount: toPaise(parseFloat(depAmount)),
      mode: depMode,
      payment_date: depDate,
      notes: depNotes || null,
      created_at: new Date().toISOString(),
    }

    setDeposits((prev) => [newDeposit, ...prev])
    setDepositModal(false)
    setSaving(false)
  }

  // Start Notice Period
  function handleStartNotice() {
    if (!tenant) return
    setSaving(true)

    const today = new Date()
    const expected = new Date(today)
    expected.setDate(expected.getDate() + tenant.notice_period_days)

    setTenant({
      ...tenant,
      status: 'notice_period',
      notice_start_date: today.toISOString().split('T')[0],
      expected_checkout_date: expected.toISOString().split('T')[0],
    })

    setNoticeConfirm(false)
    setSaving(false)
  }

  // Check Out
  function handleCheckout() {
    if (!tenant) return
    setSaving(true)

    const today = new Date().toISOString().split('T')[0]

    setTenant({
      ...tenant,
      status: 'checked_out',
      actual_checkout_date: today,
    })

    setCheckoutConfirm(false)
    setSaving(false)
    setSettlementModal(true)
  }

  // Settlement
  function handleSettlement() {
    if (!tenant || !ownerProfile) return
    setSaving(true)

    const damagesPaise = damagesAmount ? toPaise(parseFloat(damagesAmount)) : 0
    const refund = totalDepositCollected - totalUnpaidRent - damagesPaise

    const newSettlement: Settlement = {
      id: Math.random().toString(36).slice(2),
      tenant_id: tenant.id,
      owner_id: ownerProfile.id,
      total_deposit_collected: totalDepositCollected,
      total_unpaid_rent: totalUnpaidRent,
      damages_deduction: damagesPaise,
      damages_notes: damagesNotes || null,
      refund_amount: refund,
      settlement_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    setSettlement(newSettlement)
    setSettlementModal(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </AppShell>
    )
  }

  if (!tenant) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p className="text-gray-500">{t('noData')}</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/tenants')}>
            {t('back')}
          </Button>
        </div>
      </AppShell>
    )
  }

  const statusBadge = {
    active: <Badge variant="green">{t('active')}</Badge>,
    notice_period: <Badge variant="yellow">{t('noticePeriod')}</Badge>,
    checked_out: <Badge variant="gray">{t('checkedOut')}</Badge>,
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/tenants')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 font-bold"
          >
            ←
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold text-gray-900">{tenant.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {statusBadge[tenant.status]}
              {tenant.bed?.room && (
                <span className="text-sm text-gray-500">
                  {tenant.bed.room.floor?.name} → {tenant.bed.room.name} → {tenant.bed.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['profile', 'payments', 'deposits'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
                activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab === 'profile' ? t('personalInfo') : tab === 'payments' ? t('payments') : t('deposits')}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-bold text-gray-800 mb-3">{t('personalInfo')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('phone')}</span>
                  <span className="font-semibold">{tenant.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('emergencyContact')}</span>
                  <span className="font-semibold">{tenant.emergency_contact_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('emergencyPhone')}</span>
                  <span className="font-semibold">{tenant.emergency_contact_phone || 'N/A'}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-gray-800 mb-3">{t('kyc')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('aadhaarNumber')}</span>
                  <span className="font-semibold">
                    {tenant.aadhaar_number ? maskAadhaar(tenant.aadhaar_number) : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-gray-800 mb-3">{t('stayDetails')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('moveInDate')}</span>
                  <span className="font-semibold">{formatDate(tenant.move_in_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('noticeDuration')}</span>
                  <span className="font-semibold">{tenant.notice_period_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('roomType')}</span>
                  <span className="font-semibold">
                    {tenant.room_type === 'private' ? t('private') : t('shared')}
                  </span>
                </div>
                {tenant.expected_checkout_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('expectedCheckout')}</span>
                    <span className="font-semibold">{formatDate(tenant.expected_checkout_date)}</span>
                  </div>
                )}
                {tenant.actual_checkout_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('checkedOut')}</span>
                    <span className="font-semibold">{formatDate(tenant.actual_checkout_date)}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-gray-800 mb-3">{t('financials')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('monthlyRent')}</span>
                  <span className="font-semibold">{formatCurrency(tenant.monthly_rent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('securityDeposit')}</span>
                  <span className="font-semibold">{formatCurrency(tenant.security_deposit)}</span>
                </div>
              </div>
            </Card>

            {/* Status Actions */}
            <div className="space-y-2">
              {tenant.status === 'active' && (
                <Button size="lg" variant="secondary" onClick={() => setNoticeConfirm(true)}>
                  {t('startNotice')}
                </Button>
              )}
              {tenant.status === 'notice_period' && (
                <Button size="lg" variant="danger" onClick={() => setCheckoutConfirm(true)}>
                  {t('checkOut')}
                </Button>
              )}
              {tenant.status === 'active' || tenant.status === 'notice_period' ? (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => router.push(`/compliance?tenant=${tenant.id}`)}
                >
                  {t('printForm12')}
                </Button>
              ) : null}
            </div>

            {/* Settlement Summary */}
            {settlement && (
              <Card className="border-green-200 bg-green-50">
                <h3 className="font-bold text-green-800 mb-3">{t('settlementSummary')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('totalDeposit')}</span>
                    <span className="font-semibold">{formatCurrency(settlement.total_deposit_collected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('unpaidRent')}</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(settlement.total_unpaid_rent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('damagesDeduction')}</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(settlement.damages_deduction)}</span>
                  </div>
                  {settlement.damages_notes && (
                    <p className="text-xs text-gray-500 italic">{settlement.damages_notes}</p>
                  )}
                  <hr />
                  <div className="flex justify-between text-base font-bold">
                    <span>{t('refundAmount')}</span>
                    <span className={settlement.refund_amount >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {formatCurrency(settlement.refund_amount)}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            {rentCycles.length === 0 ? (
              <p className="text-gray-400 text-center py-8">{t('noData')}</p>
            ) : (
              rentCycles.map((cycle) => {
                const balance = cycle.amount_due - cycle.amount_paid
                const statusVariant =
                  cycle.status === 'paid' ? 'green' : cycle.status === 'partial' ? 'yellow' : 'red'
                return (
                  <Card key={cycle.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-800">{monthLabel(cycle.cycle_month)}</span>
                      <Badge variant={statusVariant}>{t(cycle.status as 'pending' | 'partial' | 'paid')}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-gray-500 block">{t('amountDue')}</span>
                        <span className="font-bold">{formatCurrency(cycle.amount_due)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">{t('amountPaid')}</span>
                        <span className="font-bold text-green-600">{formatCurrency(cycle.amount_paid)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">{t('balance')}</span>
                        <span className="font-bold text-red-600">{formatCurrency(balance)}</span>
                      </div>
                    </div>

                    {/* Payments for this cycle */}
                    {cycle.payments && cycle.payments.length > 0 && (
                      <div className="mb-3 border-t pt-2">
                        {cycle.payments.map((p: Payment) => (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-gray-500">{formatDate(p.payment_date)}</span>
                            <span className="font-semibold">{formatCurrency(p.amount)}</span>
                            <Badge variant={p.mode === 'digital' ? 'blue' : 'gray'}>{p.mode}</Badge>
                            {p.late_fee > 0 && (
                              <span className="text-red-500 text-xs">+{formatCurrency(p.late_fee)} fee</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {cycle.status !== 'paid' && tenant.status !== 'checked_out' && (
                      <Button size="sm" onClick={() => openPaymentModal(cycle)}>
                        {t('recordPayment')}
                      </Button>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-bold text-gray-800 mb-3">{t('depositTracking')}</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-xs text-gray-500 block">{t('totalAgreed')}</span>
                  <span className="font-bold text-base">{formatCurrency(tenant.security_deposit)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">{t('totalCollected')}</span>
                  <span className="font-bold text-base text-green-600">
                    {formatCurrency(totalDepositCollected)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">{t('balanceRemaining')}</span>
                  <span className="font-bold text-base text-red-600">
                    {formatCurrency(depositBalance)}
                  </span>
                </div>
              </div>
            </Card>

            {tenant.status !== 'checked_out' && (
              <Button
                size="lg"
                onClick={() => {
                  setDepAmount('')
                  setDepDate(new Date().toISOString().split('T')[0])
                  setDepMode('digital')
                  setDepNotes('')
                  setDepositModal(true)
                }}
              >
                {t('addInstallment')}
              </Button>
            )}

            {deposits.length === 0 ? (
              <p className="text-gray-400 text-center py-4">{t('noData')}</p>
            ) : (
              deposits.map((dep) => (
                <Card key={dep.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">{formatCurrency(dep.amount)}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(dep.payment_date)}</span>
                    </div>
                    <Badge variant={dep.mode === 'digital' ? 'blue' : 'gray'}>{dep.mode}</Badge>
                  </div>
                  {dep.notes && <p className="text-xs text-gray-400 mt-1">{dep.notes}</p>}
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title={t('recordPayment')}>
        <div className="space-y-4">
          {selectedCycle && (
            <p className="text-sm text-gray-500">
              {monthLabel(selectedCycle.cycle_month)} — {t('balance')}:{' '}
              {formatCurrency(selectedCycle.amount_due - selectedCycle.amount_paid)}
            </p>
          )}
          <Input
            label={t('amount')}
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <Input
            label={t('paymentDate')}
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('paymentMode')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayMode('cash')}
                className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-colors ${
                  payMode === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {t('cash')}
              </button>
              <button
                type="button"
                onClick={() => setPayMode('digital')}
                className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-colors ${
                  payMode === 'digital'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {t('digital')}
              </button>
            </div>
          </div>
          <Input
            label={t('lateFee')}
            type="number"
            value={payLateFee}
            onChange={(e) => setPayLateFee(e.target.value)}
            min="0"
            placeholder="0"
          />
          <Input
            label={t('notes')}
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="Optional"
          />
          <Button size="lg" onClick={handleRecordPayment} disabled={saving || !payAmount}>
            {saving ? t('loading') : t('save')}
          </Button>
        </div>
      </Modal>

      {/* Add Deposit Modal */}
      <Modal open={depositModal} onClose={() => setDepositModal(false)} title={t('addInstallment')}>
        <div className="space-y-4">
          <Input
            label={t('amount')}
            type="number"
            value={depAmount}
            onChange={(e) => setDepAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <Input
            label={t('paymentDate')}
            type="date"
            value={depDate}
            onChange={(e) => setDepDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('paymentMode')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDepMode('cash')}
                className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-colors ${
                  depMode === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {t('cash')}
              </button>
              <button
                type="button"
                onClick={() => setDepMode('digital')}
                className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-colors ${
                  depMode === 'digital'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {t('digital')}
              </button>
            </div>
          </div>
          <Input
            label={t('notes')}
            value={depNotes}
            onChange={(e) => setDepNotes(e.target.value)}
            placeholder="Optional"
          />
          <Button size="lg" onClick={handleAddDeposit} disabled={saving || !depAmount}>
            {saving ? t('loading') : t('save')}
          </Button>
        </div>
      </Modal>

      {/* Settlement Modal */}
      <Modal
        open={settlementModal}
        onClose={() => setSettlementModal(false)}
        title={t('settlementSummary')}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t('totalDeposit')}</span>
              <span className="font-bold">{formatCurrency(totalDepositCollected)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('unpaidRent')}</span>
              <span className="font-bold text-red-600">-{formatCurrency(totalUnpaidRent)}</span>
            </div>
          </div>

          <Input
            label={t('damagesDeduction')}
            type="number"
            value={damagesAmount}
            onChange={(e) => setDamagesAmount(e.target.value)}
            min="0"
            placeholder="0"
          />
          <Input
            label={t('damagesNotes')}
            value={damagesNotes}
            onChange={(e) => setDamagesNotes(e.target.value)}
            placeholder="e.g., Broken window, wall damage..."
          />

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('refundAmount')}</span>
              <span>
                {formatCurrency(
                  totalDepositCollected -
                    totalUnpaidRent -
                    (damagesAmount ? toPaise(parseFloat(damagesAmount)) : 0)
                )}
              </span>
            </div>
          </div>

          <Button size="lg" onClick={handleSettlement} disabled={saving}>
            {saving ? t('loading') : t('confirm')}
          </Button>
        </div>
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={noticeConfirm}
        onClose={() => setNoticeConfirm(false)}
        onConfirm={handleStartNotice}
        title={t('startNotice')}
        message={t('confirmNotice')}
        confirmLabel={t('confirm')}
        variant="primary"
        loading={saving}
      />
      <ConfirmDialog
        open={checkoutConfirm}
        onClose={() => setCheckoutConfirm(false)}
        onConfirm={handleCheckout}
        title={t('checkOut')}
        message={t('confirmCheckout')}
        confirmLabel={t('checkOut')}
        variant="danger"
        loading={saving}
      />
    </AppShell>
  )
}
