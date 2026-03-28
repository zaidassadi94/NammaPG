'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { mockTenants, mockDepositInstallments } from '@/lib/mock-data'
import { formatCurrency, formatDate, toPaise, toRupees } from '@/lib/utils'
import type { Tenant, DepositInstallment, PaymentMode } from '@/types/database'

export default function DepositsPageWrapper() {
  return (
    <Suspense>
      <DepositsPage />
    </Suspense>
  )
}

function DepositsPage() {
  const { t, ownerProfile, loading: appLoading } = useApp()
  const searchParams = useSearchParams()

  const [tenants] = useState<Tenant[]>(() =>
    mockTenants
      .filter((t) => t.status === 'active' || t.status === 'notice_period')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [allInstallments, setAllInstallments] = useState<DepositInstallment[]>(() => [...mockDepositInstallments])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentDate, setInstallmentDate] = useState('')
  const [installmentMode, setInstallmentMode] = useState<PaymentMode | ''>('')
  const [installmentNotes, setInstallmentNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-select from URL param
  useEffect(() => {
    const urlTenant = searchParams.get('tenant')
    if (urlTenant && tenants.some((t) => t.id === urlTenant)) {
      setSelectedTenantId(urlTenant)
    }
  }, [searchParams, tenants])

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [selectedTenantId, tenants]
  )

  // Derive installments for selected tenant
  const installments: DepositInstallment[] = useMemo(() => {
    if (!selectedTenantId) return []
    return allInstallments
      .filter((inst) => inst.tenant_id === selectedTenantId)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  }, [selectedTenantId, allInstallments])

  function openInstallmentModal() {
    setInstallmentAmount('')
    setInstallmentDate(new Date().toISOString().split('T')[0])
    setInstallmentMode('')
    setInstallmentNotes('')
    setModalOpen(true)
  }

  function handleSaveInstallment() {
    if (!ownerProfile || !selectedTenantId || !installmentMode) return

    const amountPaise = toPaise(parseFloat(installmentAmount) || 0)
    if (amountPaise <= 0) return

    setSaving(true)

    const newInstallment: DepositInstallment = {
      id: Math.random().toString(36).slice(2),
      tenant_id: selectedTenantId,
      owner_id: ownerProfile.id,
      amount: amountPaise,
      mode: installmentMode,
      payment_date: installmentDate,
      notes: installmentNotes || null,
      created_at: new Date().toISOString(),
    }

    setAllInstallments((prev) => [...prev, newInstallment])

    setSaving(false)
    setModalOpen(false)
  }

  const totalCollected = installments.reduce((sum, inst) => sum + inst.amount, 0)
  const totalAgreed = selectedTenant?.security_deposit || 0
  const balanceRemaining = totalAgreed - totalCollected

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
        <h1 className="text-xl font-extrabold text-gray-900">{t('depositTracking')}</h1>

        {/* Tenant Selector */}
        <Select
          label={t('tenants')}
          options={tenantOptions}
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
        />

        {/* Summary Card */}
        {selectedTenant && (
          <Card>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">{t('totalAgreed')}</p>
                <p className="text-lg font-extrabold text-gray-900 mt-1">
                  {formatCurrency(totalAgreed)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">{t('totalCollected')}</p>
                <p className="text-lg font-extrabold text-green-600 mt-1">
                  {formatCurrency(totalCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">{t('balanceRemaining')}</p>
                <p className="text-lg font-extrabold text-red-600 mt-1">
                  {formatCurrency(Math.max(balanceRemaining, 0))}
                </p>
              </div>
            </div>
            {totalAgreed > 0 && (
              <div className="mt-3">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min((totalCollected / totalAgreed) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {Math.round((totalCollected / totalAgreed) * 100)}%
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Add Installment Button */}
        {selectedTenantId && (
          <Button variant="primary" size="lg" onClick={openInstallmentModal}>
            {t('addInstallment')}
          </Button>
        )}

        {/* Installments Table */}
        {selectedTenantId && installments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">{t('noData')}</p>
        )}

        {installments.length > 0 && (
          <Card>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              {t('deposits')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-2 font-semibold text-gray-500 text-xs uppercase">
                      {t('paymentDate')}
                    </th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500 text-xs uppercase">
                      {t('amount')}
                    </th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-500 text-xs uppercase">
                      {t('paymentMode')}
                    </th>
                    <th className="text-left py-2 pl-2 font-semibold text-gray-500 text-xs uppercase">
                      {t('notes')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {installments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="py-2.5 pr-2 text-gray-900">
                        {formatDate(inst.payment_date)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-gray-900">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={inst.mode === 'digital' ? 'blue' : 'gray'}>
                          {t(inst.mode)}
                        </Badge>
                      </td>
                      <td className="py-2.5 pl-2 text-gray-500 text-xs">
                        {inst.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add Installment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('addInstallment')}
      >
        <div className="space-y-4">
          <Input
            label={t('amount')}
            type="number"
            step="0.01"
            min="0"
            value={installmentAmount}
            onChange={(e) => setInstallmentAmount(e.target.value)}
          />

          <Input
            label={t('paymentDate')}
            type="date"
            value={installmentDate}
            onChange={(e) => setInstallmentDate(e.target.value)}
          />

          {/* Payment Mode: Cash / Digital toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('paymentMode')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInstallmentMode('cash')}
                className={`py-3 px-4 rounded-xl text-base font-bold border-2 transition-all ${
                  installmentMode === 'cash'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {t('cash')}
              </button>
              <button
                type="button"
                onClick={() => setInstallmentMode('digital')}
                className={`py-3 px-4 rounded-xl text-base font-bold border-2 transition-all ${
                  installmentMode === 'digital'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {t('digital')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('notes')}
            </label>
            <textarea
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[80px]"
              value={installmentNotes}
              onChange={(e) => setInstallmentNotes(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveInstallment}
            disabled={saving || !installmentMode || !installmentAmount}
          >
            {saving ? t('loading') : t('save')}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
