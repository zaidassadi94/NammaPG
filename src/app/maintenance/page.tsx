'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createClient } from '@/lib/supabase-browser'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { MaintenanceLog, MaintenanceStatus, Room, Tenant } from '@/types/database'

interface MaintenanceLogWithDetails extends MaintenanceLog {
  room?: Room & { floor?: { name: string } }
  tenant?: Pick<Tenant, 'full_name'> | null
}

interface RoomOption {
  id: string
  name: string
  floor_name: string
}

const STATUS_BADGE: Record<MaintenanceStatus, 'red' | 'yellow' | 'green'> = {
  reported: 'red',
  in_progress: 'yellow',
  fixed: 'green',
}

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  fixed: 'Fixed',
}

const NEXT_STATUS: Record<string, MaintenanceStatus> = {
  reported: 'in_progress',
  in_progress: 'fixed',
}

export default function MaintenancePage() {
  const { ownerProfile, loading: appLoading } = useApp()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<MaintenanceLogWithDetails[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [filterRoom, setFilterRoom] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<MaintenanceLogWithDetails | null>(null)

  useEffect(() => {
    if (!ownerProfile) return
    fetchRooms()
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerProfile])

  async function fetchRooms() {
    const { data } = await supabase
      .from('rooms')
      .select('id, name, floor:floors(name)')
      .eq('owner_id', ownerProfile!.id)
      .order('sort_order')

    if (data) {
      const mapped: RoomOption[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        floor_name: r.floor?.name || '',
      }))
      setRooms(mapped)
    }
  }

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_logs')
      .select(
        '*, room:rooms(name, floor:floors(name)), tenant:tenants!reported_by_tenant_id(full_name)'
      )
      .eq('owner_id', ownerProfile!.id)
      .order('date_reported', { ascending: false })

    if (data) {
      setLogs(data as MaintenanceLogWithDetails[])
    }
    setLoading(false)
  }

  function handleStatusTap(log: MaintenanceLogWithDetails) {
    if (log.status === 'fixed') return
    setSelectedLog(log)
    setConfirmOpen(true)
  }

  async function handleStatusConfirm() {
    if (!selectedLog) return
    setConfirmLoading(true)

    const nextStatus = NEXT_STATUS[selectedLog.status]
    const updates: Record<string, any> = { status: nextStatus }

    if (nextStatus === 'fixed') {
      updates.date_fixed = new Date().toISOString().split('T')[0]
    }

    await supabase
      .from('maintenance_logs')
      .update(updates)
      .eq('id', selectedLog.id)

    setConfirmLoading(false)
    setConfirmOpen(false)
    setSelectedLog(null)
    await fetchLogs()
  }

  // Build room filter options grouped by floor
  const roomFilterOptions = [
    { value: '', label: 'All Rooms' },
    ...rooms.map((r) => ({
      value: r.id,
      label: r.floor_name ? `${r.floor_name} - ${r.name}` : r.name,
    })),
  ]

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'reported', label: 'Reported' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'fixed', label: 'Fixed' },
  ]

  // Apply filters
  const filteredLogs = logs.filter((log) => {
    if (filterRoom && log.room_id !== filterRoom) return false
    if (filterStatus && log.status !== filterStatus) return false
    return true
  })

  if (appLoading || loading) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">Maintenance</h2>
          <Link href="/maintenance/new">
            <Button size="sm">Log New Issue</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            options={roomFilterOptions}
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          />
          <Select
            options={statusFilterOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>

        {/* Maintenance Cards */}
        {filteredLogs.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">
              No maintenance issues found.
            </p>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const roomName = (log.room as any)?.name || '-'
            const floorName = (log.room as any)?.floor?.name
            const reportedBy = log.reported_by_owner
              ? 'Owner (self-reported)'
              : (log.tenant as any)?.full_name || '-'

            return (
              <Card key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {log.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {floorName ? `${floorName} - ${roomName}` : roomName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Reported by: {reportedBy}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(log.date_reported)}
                    </p>
                    {log.repair_cost != null && log.repair_cost > 0 && (
                      <p className="text-xs font-semibold text-gray-600 mt-1">
                        Cost: {formatCurrency(log.repair_cost)}
                      </p>
                    )}
                    {log.date_fixed && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Fixed on: {formatDate(log.date_fixed)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStatusTap(log)}
                    disabled={log.status === 'fixed'}
                    className={cn(
                      'shrink-0',
                      log.status !== 'fixed' && 'cursor-pointer'
                    )}
                  >
                    <Badge variant={STATUS_BADGE[log.status]}>
                      {STATUS_LABEL[log.status]}
                    </Badge>
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Status Change Confirm Dialog */}
      {selectedLog && (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false)
            setSelectedLog(null)
          }}
          onConfirm={handleStatusConfirm}
          title="Update Status"
          message={`Change status from "${STATUS_LABEL[selectedLog.status]}" to "${STATUS_LABEL[NEXT_STATUS[selectedLog.status]]}"?`}
          confirmLabel={`Mark as ${STATUS_LABEL[NEXT_STATUS[selectedLog.status]]}`}
          variant="primary"
          loading={confirmLoading}
        />
      )}
    </AppShell>
  )
}
