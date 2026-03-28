'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import { mockRooms, mockFloors, mockTenants, mockBeds } from '@/lib/mock-data'
import { toPaise } from '@/lib/utils'
import type { Room, Tenant } from '@/types/database'

interface RoomOption {
  id: string
  name: string
  floor_name: string
}

interface TenantOption {
  id: string
  full_name: string
}

export default function NewMaintenancePage() {
  const { ownerProfile, loading: appLoading } = useApp()
  const router = useRouter()

  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [roomId, setRoomId] = useState('')
  const [reportedBy, setReportedBy] = useState('')
  const [description, setDescription] = useState('')
  const [dateReported, setDateReported] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [repairCost, setRepairCost] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!ownerProfile) return

    // Build room options from mock data
    const mapped: RoomOption[] = mockRooms.map((r) => {
      const floor = mockFloors.find((f) => f.id === r.floor_id)
      return {
        id: r.id,
        name: r.name,
        floor_name: floor?.name || '',
      }
    })
    setRooms(mapped)
  }, [ownerProfile])

  useEffect(() => {
    if (!roomId || !ownerProfile) {
      setTenants([])
      setReportedBy('')
      return
    }

    // Find tenants whose bed is in the selected room
    const bedsInRoom = mockBeds
      .filter((b) => b.room_id === roomId && b.tenant_id != null)
      .map((b) => b.tenant_id!)

    const activeTenants: TenantOption[] = mockTenants
      .filter((t) => bedsInRoom.includes(t.id) && t.status === 'active')
      .map((t) => ({ id: t.id, full_name: t.full_name }))

    setTenants(activeTenants)
    setReportedBy('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!roomId) newErrors.roomId = 'Please select a room'
    if (!reportedBy) newErrors.reportedBy = 'Please select who reported this'
    if (!description.trim()) newErrors.description = 'Please describe the issue'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !ownerProfile) return

    setSubmitting(true)

    const isOwnerReported = reportedBy === 'owner'
    const tenantId = isOwnerReported ? null : reportedBy

    const newLog = {
      id: Math.random().toString(36).slice(2),
      owner_id: ownerProfile.id,
      room_id: roomId,
      reported_by_tenant_id: tenantId,
      reported_by_owner: isOwnerReported,
      description: description.trim(),
      date_reported: dateReported,
      status: 'reported' as const,
      repair_cost: repairCost ? toPaise(parseFloat(repairCost)) : null,
      photo_before_url: null,
      photo_after_url: null,
      date_fixed: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Add to mock data array (in-memory only)
    const { mockMaintenanceLogs } = await import('@/lib/mock-data')
    mockMaintenanceLogs.push(newLog)

    router.push('/maintenance')
  }

  // Build room select options grouped by floor
  const roomOptions = [
    { value: '', label: 'Select a room' },
    ...rooms.map((r) => ({
      value: r.id,
      label: r.floor_name ? `${r.floor_name} - ${r.name}` : r.name,
    })),
  ]

  // Build reported-by options
  const reportedByOptions = [
    { value: '', label: 'Select reporter' },
    { value: 'owner', label: 'Owner (self-reported)' },
    ...tenants.map((t) => ({
      value: t.id,
      label: t.full_name,
    })),
  ]

  if (appLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500 text-lg font-semibold">Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-gray-900">Log New Issue</h2>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              id="room"
              label="Room"
              options={roomOptions}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              error={errors.roomId}
            />

            <Select
              id="reportedBy"
              label="Reported By"
              options={reportedByOptions}
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              error={errors.reportedBy}
            />

            <div className="w-full">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Issue Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 text-base border-2 rounded-xl bg-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  errors.description ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="Describe the maintenance issue..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <Input
              id="dateReported"
              label="Date Reported"
              type="date"
              value={dateReported}
              onChange={(e) => setDateReported(e.target.value)}
            />

            <Input
              id="repairCost"
              label="Repair Cost (in Rupees)"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={repairCost}
              onChange={(e) => setRepairCost(e.target.value)}
            />

            <div className="w-full">
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Notes about repair
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => router.push('/maintenance')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Log Issue'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}
