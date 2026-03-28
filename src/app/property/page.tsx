'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import { mockFloors, mockRooms, mockBeds, mockTenants } from '@/lib/mock-data'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import Select from '@/components/ui/Select'
import type { FloorWithRooms, RoomWithBeds, Bed } from '@/types/database'
import { cn } from '@/lib/utils'

type ModalMode =
  | { type: 'addFloor' }
  | { type: 'renameFloor'; floorId: string; currentName: string }
  | { type: 'addRoom'; floorId: string }
  | { type: 'renameRoom'; roomId: string; currentName: string }
  | null

type ConfirmMode =
  | { type: 'deleteFloor'; floorId: string; floorName: string }
  | { type: 'deleteRoom'; roomId: string; roomName: string }
  | null

function buildFloorsWithRooms(): FloorWithRooms[] {
  return mockFloors.map((floor) => ({
    ...floor,
    rooms: mockRooms
      .filter((r) => r.floor_id === floor.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((room) => ({
        ...room,
        beds: mockBeds
          .filter((b) => b.room_id === room.id)
          .sort((a, b) => a.label.localeCompare(b.label)),
      })),
  }))
}

function buildTenantMap(): Record<string, { full_name: string }> {
  const map: Record<string, { full_name: string }> = {}
  mockTenants.forEach((t) => {
    map[t.id] = t
  })
  return map
}

export default function PropertyPage() {
  const { t } = useApp()

  const [floors, setFloors] = useState<FloorWithRooms[]>([])
  const [tenantMap] = useState<Record<string, { full_name: string }>>(buildTenantMap)
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [modal, setModal] = useState<ModalMode>(null)
  const [modalInput, setModalInput] = useState('')
  const [bedCountInput, setBedCountInput] = useState('1')

  // Confirm dialog state
  const [confirm, setConfirm] = useState<ConfirmMode>(null)
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    const initialFloors = buildFloorsWithRooms()
    setFloors(initialFloors)
    setExpandedFloors(new Set(initialFloors.map((f) => f.id)))
    setLoading(false)
  }, [])

  // --- Toggle floor expansion ---
  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(floorId)) {
        next.delete(floorId)
      } else {
        next.add(floorId)
      }
      return next
    })
  }

  // --- Check if any bed in a set of rooms is non-empty ---
  const hasOccupiedOrNoticeBeds = (rooms: RoomWithBeds[]): boolean => {
    return rooms.some((room) =>
      room.beds.some(
        (bed) => bed.status === 'occupied' || bed.status === 'notice_period'
      )
    )
  }

  // --- Add Floor ---
  const handleAddFloor = () => {
    if (!modalInput.trim()) return
    setSaving(true)

    const maxSort = floors.reduce((max, f) => Math.max(max, f.sort_order), 0)

    const newFloor: FloorWithRooms = {
      id: Math.random().toString(36).slice(2),
      owner_id: 'mock-owner-001',
      name: modalInput.trim(),
      sort_order: maxSort + 1,
      created_at: new Date().toISOString(),
      rooms: [],
    }

    setFloors((prev) => [...prev, newFloor])
    setExpandedFloors((prev) => new Set([...prev, newFloor.id]))
    setSaving(false)
    setModal(null)
    setModalInput('')
  }

  // --- Rename Floor ---
  const handleRenameFloor = (floorId: string) => {
    if (!modalInput.trim()) return
    setSaving(true)

    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId ? { ...f, name: modalInput.trim() } : f
      )
    )

    setSaving(false)
    setModal(null)
    setModalInput('')
  }

  // --- Delete Floor ---
  const handleDeleteFloor = (floorId: string) => {
    const floor = floors.find((f) => f.id === floorId)
    if (!floor) return

    if (hasOccupiedOrNoticeBeds(floor.rooms)) {
      setConfirmError(t('cannotDelete'))
      return
    }

    setSaving(true)
    setFloors((prev) => prev.filter((f) => f.id !== floorId))
    setSaving(false)
    setConfirm(null)
    setConfirmError('')
  }

  // --- Add Room ---
  const handleAddRoom = (floorId: string) => {
    if (!modalInput.trim()) return
    setSaving(true)

    const floor = floors.find((f) => f.id === floorId)
    const maxSort = floor
      ? floor.rooms.reduce((max, r) => Math.max(max, r.sort_order), 0)
      : 0

    const bedCount = parseInt(bedCountInput, 10) || 1
    const roomId = Math.random().toString(36).slice(2)

    const newBeds: Bed[] = Array.from({ length: bedCount }, (_, i) => ({
      id: Math.random().toString(36).slice(2),
      room_id: roomId,
      owner_id: 'mock-owner-001',
      label: `Bed ${i + 1}`,
      status: 'empty' as const,
      tenant_id: null,
      created_at: new Date().toISOString(),
    }))

    const newRoom: RoomWithBeds = {
      id: roomId,
      floor_id: floorId,
      owner_id: 'mock-owner-001',
      name: modalInput.trim(),
      bed_count: bedCount,
      is_private: false,
      sort_order: maxSort + 1,
      created_at: new Date().toISOString(),
      beds: newBeds,
    }

    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId ? { ...f, rooms: [...f.rooms, newRoom] } : f
      )
    )

    setSaving(false)
    setModal(null)
    setModalInput('')
    setBedCountInput('1')
  }

  // --- Rename Room ---
  const handleRenameRoom = (roomId: string) => {
    if (!modalInput.trim()) return
    setSaving(true)

    setFloors((prev) =>
      prev.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.id === roomId ? { ...r, name: modalInput.trim() } : r
        ),
      }))
    )

    setSaving(false)
    setModal(null)
    setModalInput('')
  }

  // --- Delete Room ---
  const handleDeleteRoom = (roomId: string) => {
    const room = floors
      .flatMap((f) => f.rooms)
      .find((r) => r.id === roomId)
    if (!room) return

    if (
      room.beds.some(
        (bed) => bed.status === 'occupied' || bed.status === 'notice_period'
      )
    ) {
      setConfirmError(t('cannotDelete'))
      return
    }

    setSaving(true)
    setFloors((prev) =>
      prev.map((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.id !== roomId),
      }))
    )
    setSaving(false)
    setConfirm(null)
    setConfirmError('')
  }

  // --- Private Room Toggle ---
  const handlePrivateToggle = (room: RoomWithBeds, enabled: boolean) => {
    if (enabled) {
      setFloors((prev) =>
        prev.map((f) => ({
          ...f,
          rooms: f.rooms.map((r) =>
            r.id === room.id
              ? {
                  ...r,
                  is_private: true,
                  beds: r.beds.map((b) => ({ ...b, status: 'blocked' as const })),
                }
              : r
          ),
        }))
      )
    } else {
      const hasActiveTenants = room.beds.some(
        (bed) => bed.status === 'occupied' || bed.status === 'notice_period'
      )
      if (hasActiveTenants) return

      setFloors((prev) =>
        prev.map((f) => ({
          ...f,
          rooms: f.rooms.map((r) =>
            r.id === room.id
              ? {
                  ...r,
                  is_private: false,
                  beds: r.beds.map((b) => ({
                    ...b,
                    status: 'empty' as const,
                    tenant_id: null,
                  })),
                }
              : r
          ),
        }))
      )
    }
  }

  // --- Bed status badge ---
  const renderBedBadge = (bed: Bed) => {
    const tenantName = bed.tenant_id
      ? (tenantMap[bed.tenant_id]?.full_name ??
        mockTenants.find((t) => t.id === bed.tenant_id)?.full_name)
      : null

    switch (bed.status) {
      case 'empty':
        return <Badge variant="green">{t('empty')}</Badge>
      case 'occupied':
        return (
          <Badge variant="blue">
            {t('occupied')}{tenantName ? ` — ${tenantName}` : ''}
          </Badge>
        )
      case 'blocked':
        return <Badge variant="gray">{t('blocked')}</Badge>
      case 'notice_period':
        return (
          <Badge variant="yellow">
            {t('noticePeriod')}{tenantName ? ` — ${tenantName}` : ''}
          </Badge>
        )
      default:
        return null
    }
  }

  // --- Open modal helpers ---
  const openAddFloor = () => {
    setModalInput('')
    setModal({ type: 'addFloor' })
  }

  const openRenameFloor = (floorId: string, currentName: string) => {
    setModalInput(currentName)
    setModal({ type: 'renameFloor', floorId, currentName })
  }

  const openAddRoom = (floorId: string) => {
    setModalInput('')
    setBedCountInput('1')
    setModal({ type: 'addRoom', floorId })
  }

  const openRenameRoom = (roomId: string, currentName: string) => {
    setModalInput(currentName)
    setModal({ type: 'renameRoom', roomId, currentName })
  }

  const openDeleteFloor = (floorId: string, floorName: string) => {
    setConfirmError('')
    setConfirm({ type: 'deleteFloor', floorId, floorName })
  }

  const openDeleteRoom = (roomId: string, roomName: string) => {
    setConfirmError('')
    setConfirm({ type: 'deleteRoom', roomId, roomName })
  }

  // --- Modal submit ---
  const handleModalSubmit = () => {
    if (!modal) return
    switch (modal.type) {
      case 'addFloor':
        return handleAddFloor()
      case 'renameFloor':
        return handleRenameFloor(modal.floorId)
      case 'addRoom':
        return handleAddRoom(modal.floorId)
      case 'renameRoom':
        return handleRenameRoom(modal.roomId)
    }
  }

  const getModalTitle = (): string => {
    if (!modal) return ''
    switch (modal.type) {
      case 'addFloor':
        return t('addFloor')
      case 'renameFloor':
        return `${t('edit')} ${t('floors')}`
      case 'addRoom':
        return t('addRoom')
      case 'renameRoom':
        return `${t('edit')} ${t('rooms')}`
    }
  }

  // --- Confirm submit ---
  const handleConfirmSubmit = () => {
    if (!confirm) return
    switch (confirm.type) {
      case 'deleteFloor':
        return handleDeleteFloor(confirm.floorId)
      case 'deleteRoom':
        return handleDeleteRoom(confirm.roomId)
    }
  }

  const bedCountOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
  ]

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500 font-semibold">{t('loading')}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{t('property')}</h2>
        <Button size="sm" onClick={openAddFloor}>
          {t('addFloor')}
        </Button>
      </div>

      {/* No floors */}
      {floors.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-gray-500">{t('noData')}</p>
        </Card>
      )}

      {/* Floor list */}
      <div className="space-y-4">
        {floors.map((floor) => {
          const isExpanded = expandedFloors.has(floor.id)

          return (
            <Card key={floor.id} className="p-0 overflow-hidden">
              {/* Floor header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleFloor(floor.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-bold transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                  >
                    &#9654;
                  </span>
                  <h3 className="font-bold text-gray-900">{floor.name}</h3>
                  <span className="text-xs text-gray-400">
                    ({floor.rooms.length} {t('rooms')})
                  </span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openRenameFloor(floor.id, floor.name)}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteFloor(floor.id, floor.name)}
                    className="text-red-500"
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {/* Add room button */}
                  <div className="pt-3 pb-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAddRoom(floor.id)}
                    >
                      {t('addRoom')}
                    </Button>
                  </div>

                  {/* Room list */}
                  {floor.rooms.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">{t('noData')}</p>
                  )}

                  <div className="space-y-3">
                    {floor.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="border-2 border-gray-100 rounded-xl p-3"
                      >
                        {/* Room header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-800">
                              {room.name}
                            </h4>
                            <span className="text-xs text-gray-400">
                              ({room.beds.length} {t('beds')})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openRenameRoom(room.id, room.name)}
                            >
                              {t('edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteRoom(room.id, room.name)}
                              className="text-red-500"
                            >
                              {t('delete')}
                            </Button>
                          </div>
                        </div>

                        {/* Private room toggle */}
                        <div className="mb-2">
                          <ToggleSwitch
                            enabled={room.is_private}
                            onChange={(enabled) => handlePrivateToggle(room, enabled)}
                            label={t('privateRoom')}
                            disabled={
                              !room.is_private &&
                              room.beds.some(
                                (b) =>
                                  b.status === 'occupied' ||
                                  b.status === 'notice_period'
                              )
                            }
                          />
                        </div>

                        {/* Bed list */}
                        <div className="space-y-1.5">
                          {room.beds.map((bed) => (
                            <div
                              key={bed.id}
                              className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                {bed.label}
                              </span>
                              {renderBedBadge(bed)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Modal for add/rename floor and room */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={getModalTitle()}
      >
        <div className="space-y-4">
          {(modal?.type === 'addFloor' || modal?.type === 'renameFloor') && (
            <Input
              label={t('floorName')}
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={t('floorName')}
              autoFocus
            />
          )}

          {(modal?.type === 'addRoom' || modal?.type === 'renameRoom') && (
            <Input
              label={t('roomName')}
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={t('roomName')}
              autoFocus
            />
          )}

          {modal?.type === 'addRoom' && (
            <Select
              label={t('bedCount')}
              value={bedCountInput}
              onChange={(e) => setBedCountInput(e.target.value)}
              options={bedCountOptions}
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModal(null)}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={saving || !modalInput.trim()}
              className="flex-1"
            >
              {saving ? t('loading') : t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm dialog for deletes */}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => {
          setConfirm(null)
          setConfirmError('')
        }}
        onConfirm={handleConfirmSubmit}
        title={t('delete')}
        message={
          confirmError ||
          `${t('confirmDelete')} ${
            confirm?.type === 'deleteFloor'
              ? confirm.floorName
              : confirm?.type === 'deleteRoom'
              ? confirm.roomName
              : ''
          }`
        }
        confirmLabel={confirmError ? t('close') : t('delete')}
        variant="danger"
        loading={saving}
      />
    </AppShell>
  )
}
