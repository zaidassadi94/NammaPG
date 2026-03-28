'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { mockTenants, mockBeds, mockRooms, mockFloors, mockRentCycles, mockPayments, mockDepositInstallments } from '@/lib/mock-data'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import type { Bed, Room, Floor } from '@/types/database'
import { toPaise, cn } from '@/lib/utils'

interface BedWithDetails extends Bed {
  room?: Room & { floor?: Floor }
}

export default function NewTenantPage() {
  const { t, ownerProfile, loading: appLoading } = useApp()
  const router = useRouter()

  // Build available beds with joined room/floor data
  const availableBeds: BedWithDetails[] = useMemo(() => {
    return mockBeds
      .filter((b) => b.status === 'empty')
      .map((bed) => {
        const room = mockRooms.find((r) => r.id === bed.room_id)
        const floor = room ? mockFloors.find((f) => f.id === room.floor_id) : undefined
        return {
          ...bed,
          room: room
            ? {
                ...room,
                floor: floor || undefined,
              }
            : undefined,
        }
      })
  }, [])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split('T')[0])
  const [noticePeriodDays, setNoticePeriodDays] = useState(30)
  const [roomType, setRoomType] = useState<'shared' | 'private'>('shared')
  const [selectedBedId, setSelectedBedId] = useState('')
  const [monthlyRentRupees, setMonthlyRentRupees] = useState('')
  const [securityDepositRupees, setSecurityDepositRupees] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')

  // Group beds by floor/room for the dropdown
  const bedOptions = (() => {
    const options: { value: string; label: string }[] = [
      { value: '', label: t('selectBed') },
    ]

    // Group by floor then room
    const grouped = new Map<string, { floorName: string; roomName: string; beds: BedWithDetails[] }>()
    for (const bed of availableBeds) {
      const roomId = bed.room_id
      if (!grouped.has(roomId)) {
        grouped.set(roomId, {
          floorName: bed.room?.floor?.name || '',
          roomName: bed.room?.name || '',
          beds: [],
        })
      }
      grouped.get(roomId)!.beds.push(bed)
    }

    for (const [, group] of grouped) {
      for (const bed of group.beds) {
        options.push({
          value: bed.id,
          label: `${group.floorName} / ${group.roomName} / ${bed.label}`,
        })
      }
    }

    return options
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerProfile) return

    if (!fullName.trim() || !phone.trim() || !moveInDate || !selectedBedId || !monthlyRentRupees) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const newId = Math.random().toString(36).slice(2)

      // In demo mode, just redirect to the tenants list
      router.push('/tenants')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setSubmitting(false)
    }
  }

  if (appLoading) {
    return (
      <AppShell>
        <p className="text-center text-gray-500 py-10">{t('loading')}</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-blue-600 font-semibold text-sm">
          {t('back')}
        </button>
        <h2 className="text-xl font-bold text-gray-900">{t('addTenant')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Info */}
        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('personalInfo')}</h3>
          <div className="space-y-3">
            <Input
              id="fullName"
              label={t('fullName') + ' *'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="phone"
              label={t('phone') + ' *'}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              id="emergencyContactName"
              label={t('emergencyContact')}
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
            <Input
              id="emergencyContactPhone"
              label={t('emergencyPhone')}
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>
        </Card>

        {/* Stay Details */}
        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('stayDetails')}</h3>
          <div className="space-y-3">
            <Input
              id="moveInDate"
              label={t('moveInDate') + ' *'}
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              required
            />
            <Input
              id="noticePeriodDays"
              label={t('noticeDuration')}
              type="number"
              value={noticePeriodDays}
              onChange={(e) => setNoticePeriodDays(parseInt(e.target.value) || 30)}
              min={1}
            />
            <Select
              id="roomType"
              label={t('roomType')}
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as 'shared' | 'private')}
              options={[
                { value: 'shared', label: t('shared') },
                { value: 'private', label: t('private') },
              ]}
            />
            <Select
              id="assignedBed"
              label={t('assignedBed') + ' *'}
              value={selectedBedId}
              onChange={(e) => setSelectedBedId(e.target.value)}
              options={bedOptions}
            />
          </div>
        </Card>

        {/* Financials */}
        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('financials')}</h3>
          <div className="space-y-3">
            <Input
              id="monthlyRent"
              label={t('monthlyRent') + ' *'}
              type="number"
              value={monthlyRentRupees}
              onChange={(e) => setMonthlyRentRupees(e.target.value)}
              placeholder="e.g. 8000"
              min={0}
              step="0.01"
              required
            />
            <Input
              id="securityDeposit"
              label={t('securityDeposit')}
              type="number"
              value={securityDepositRupees}
              onChange={(e) => setSecurityDepositRupees(e.target.value)}
              placeholder="e.g. 10000"
              min={0}
              step="0.01"
            />
          </div>
        </Card>

        {/* KYC */}
        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('kyc')}</h3>
          <Input
            id="aadhaarNumber"
            label={t('aadhaarNumber')}
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(e.target.value)}
            placeholder="1234 5678 9012"
            maxLength={14}
          />
        </Card>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t('loading') : t('save')}
        </Button>
      </form>
    </AppShell>
  )
}
