'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { mockTenants, mockRentCycles, mockPayments, mockBeds, mockRooms, mockFloors, mockMaintenanceLogs } from '@/lib/mock-data'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import type { Payment, RentCycle, Tenant, MaintenanceLog } from '@/types/database'
import { formatCurrency, formatDate, toRupees, monthLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'

type ReportTab = 'white' | 'full' | 'occupancy' | 'expense'

interface PaymentRow {
  tenantName: string
  cycleMonth: string
  amount: number
  mode: string
  paymentDate: string
  lateFee: number
}

interface OccupancyRow {
  month: string
  totalBeds: number
  occupied: number
  empty: number
  occupancyRate: number
}

interface ExpenseRow {
  roomName: string
  description: string
  dateReported: string
  cost: number
  status: string
}

export default function ReportsPage() {
  const { ownerProfile } = useApp()

  const [activeTab, setActiveTab] = useState<ReportTab>('white')
  const [loading, setLoading] = useState(false)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tenantFilter, setTenantFilter] = useState('all')
  const [roomFilter, setRoomFilter] = useState('all')

  // Data
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([])
  const [occupancyRows, setOccupancyRows] = useState<OccupancyRow[]>([])
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([])

  // Dropdown options
  const [tenants, setTenants] = useState<{ id: string; full_name: string }[]>([])
  const [rooms, setRooms] = useState<{ id: string; name: string; floor_name: string }[]>([])

  // Load tenants and rooms for filter dropdowns
  useEffect(() => {
    if (!ownerProfile) return

    const tenantData = mockTenants
      .filter((t) => t.owner_id === ownerProfile.id)
      .map((t) => ({ id: t.id, full_name: t.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    setTenants(tenantData)

    const roomData = mockRooms
      .filter((r) => r.owner_id === ownerProfile.id)
      .map((r) => {
        const floor = mockFloors.find((f) => f.id === r.floor_id)
        return {
          id: r.id,
          name: r.name,
          floor_name: floor?.name || '',
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    setRooms(roomData)
  }, [ownerProfile])

  // Fetch payment data (white or full report)
  const fetchPayments = useCallback(
    (digitalOnly: boolean) => {
      if (!ownerProfile) return
      setLoading(true)

      let filtered = mockPayments
        .filter((p) => p.owner_id === ownerProfile.id)
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date))

      if (digitalOnly) {
        filtered = filtered.filter((p) => p.mode === 'digital')
      }

      if (dateFrom) {
        filtered = filtered.filter((p) => p.payment_date >= dateFrom)
      }
      if (dateTo) {
        filtered = filtered.filter((p) => p.payment_date <= dateTo)
      }
      if (tenantFilter !== 'all') {
        filtered = filtered.filter((p) => p.tenant_id === tenantFilter)
      }

      // Room filter: filter by tenant bed -> room
      if (roomFilter !== 'all') {
        const bedsInRoom = mockBeds.filter((b) => b.room_id === roomFilter)
        const tenantIdsInRoom = new Set(
          bedsInRoom.filter((b) => b.tenant_id).map((b) => b.tenant_id)
        )
        filtered = filtered.filter((p) => tenantIdsInRoom.has(p.tenant_id))
      }

      const rows: PaymentRow[] = filtered.map((p) => {
        const tenant = mockTenants.find((t) => t.id === p.tenant_id)
        const rentCycle = mockRentCycles.find((rc) => rc.id === p.rent_cycle_id)
        return {
          tenantName: tenant?.full_name || 'Unknown',
          cycleMonth: rentCycle?.cycle_month
            ? monthLabel(rentCycle.cycle_month)
            : '-',
          amount: p.amount,
          mode: p.mode,
          paymentDate: p.payment_date,
          lateFee: p.late_fee,
        }
      })

      setPaymentRows(rows)
      setLoading(false)
    },
    [ownerProfile, dateFrom, dateTo, tenantFilter, roomFilter]
  )

  // Fetch occupancy data
  const fetchOccupancy = useCallback(() => {
    if (!ownerProfile) return
    setLoading(true)

    const beds = mockBeds.filter((b) => b.owner_id === ownerProfile.id)

    if (beds.length === 0) {
      setOccupancyRows([])
      setLoading(false)
      return
    }

    const totalBeds = beds.length
    const occupiedBeds = beds.filter(
      (b) => b.status === 'occupied' || b.status === 'notice_period'
    ).length
    const emptyBeds = totalBeds - occupiedBeds

    // Generate monthly rows from dateFrom to dateTo (or default last 6 months)
    const now = new Date()
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const endDate = dateTo ? new Date(dateTo) : now

    const rows: OccupancyRow[] = []
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

    while (current <= endDate) {
      const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

      rows.push({
        month: monthStr,
        totalBeds,
        occupied: occupiedBeds,
        empty: emptyBeds,
        occupancyRate: rate,
      })

      current.setMonth(current.getMonth() + 1)
    }

    setOccupancyRows(rows)
    setLoading(false)
  }, [ownerProfile, dateFrom, dateTo])

  // Fetch expense data
  const fetchExpenses = useCallback(() => {
    if (!ownerProfile) return
    setLoading(true)

    let filtered = mockMaintenanceLogs
      .filter(
        (m) =>
          m.owner_id === ownerProfile.id && m.repair_cost != null
      )
      .sort((a, b) => b.date_reported.localeCompare(a.date_reported))

    if (dateFrom) {
      filtered = filtered.filter((m) => m.date_reported >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter((m) => m.date_reported <= dateTo)
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter((m) => m.room_id === roomFilter)
    }

    const rows: ExpenseRow[] = filtered.map((m) => {
      const room = mockRooms.find((r) => r.id === m.room_id)
      return {
        roomName: room?.name || 'Unknown',
        description: m.description,
        dateReported: m.date_reported,
        cost: m.repair_cost || 0,
        status: m.status,
      }
    })

    setExpenseRows(rows)
    setLoading(false)
  }, [ownerProfile, dateFrom, dateTo, roomFilter])

  // Refetch when tab or filters change
  useEffect(() => {
    if (!ownerProfile) return

    if (activeTab === 'white') {
      fetchPayments(true)
    } else if (activeTab === 'full') {
      fetchPayments(false)
    } else if (activeTab === 'occupancy') {
      fetchOccupancy()
    } else if (activeTab === 'expense') {
      fetchExpenses()
    }
  }, [activeTab, ownerProfile, fetchPayments, fetchOccupancy, fetchExpenses])

  // --- PDF Export ---
  const exportPaymentsPDF = (title: string) => {
    const doc = new jsPDF()
    doc.text(title, 14, 20)
    ;(doc as any).autoTable({
      startY: 30,
      head: [['Tenant', 'Month', 'Amount', 'Mode', 'Date', 'Late Fee']],
      body: paymentRows.map((row) => [
        row.tenantName,
        row.cycleMonth,
        formatCurrency(row.amount),
        row.mode,
        formatDate(row.paymentDate),
        row.lateFee > 0 ? formatCurrency(row.lateFee) : '-',
      ]),
    })
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`)
  }

  const exportOccupancyPDF = () => {
    const doc = new jsPDF()
    doc.text('Occupancy Report', 14, 20)
    ;(doc as any).autoTable({
      startY: 30,
      head: [['Month', 'Total Beds', 'Occupied', 'Empty', 'Occupancy Rate']],
      body: occupancyRows.map((row) => [
        monthLabel(row.month),
        row.totalBeds,
        row.occupied,
        row.empty,
        `${row.occupancyRate}%`,
      ]),
    })
    doc.save('occupancy_report.pdf')
  }

  const exportExpensePDF = () => {
    const doc = new jsPDF()
    doc.text('Expense Report', 14, 20)
    const totalCost = expenseRows.reduce((sum, r) => sum + r.cost, 0)
    ;(doc as any).autoTable({
      startY: 30,
      head: [['Room', 'Description', 'Date', 'Cost', 'Status']],
      body: [
        ...expenseRows.map((row) => [
          row.roomName,
          row.description,
          formatDate(row.dateReported),
          formatCurrency(row.cost),
          row.status,
        ]),
        ['', '', '', formatCurrency(totalCost), 'TOTAL'],
      ],
    })
    doc.save('expense_report.pdf')
  }

  // --- CSV Export ---
  const downloadCSV = (data: Record<string, any>[], filename: string) => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPaymentsCSV = (filename: string) => {
    const data = paymentRows.map((row) => ({
      Tenant: row.tenantName,
      Month: row.cycleMonth,
      Amount: toRupees(row.amount),
      Mode: row.mode,
      Date: formatDate(row.paymentDate),
      'Late Fee': toRupees(row.lateFee),
    }))
    downloadCSV(data, filename)
  }

  const exportOccupancyCSV = () => {
    const data = occupancyRows.map((row) => ({
      Month: monthLabel(row.month),
      'Total Beds': row.totalBeds,
      Occupied: row.occupied,
      Empty: row.empty,
      'Occupancy Rate (%)': row.occupancyRate,
    }))
    downloadCSV(data, 'occupancy_report.csv')
  }

  const exportExpenseCSV = () => {
    const data = expenseRows.map((row) => ({
      Room: row.roomName,
      Description: row.description,
      Date: formatDate(row.dateReported),
      Cost: toRupees(row.cost),
      Status: row.status,
    }))
    downloadCSV(data, 'expense_report.csv')
  }

  // --- Filter options ---
  const tenantOptions = [
    { value: 'all', label: 'All Tenants' },
    ...tenants.map((t) => ({ value: t.id, label: t.full_name })),
  ]

  const roomOptions = [
    { value: 'all', label: 'All Rooms' },
    ...rooms.map((r) => ({
      value: r.id,
      label: r.floor_name ? `${r.floor_name} - ${r.name}` : r.name,
    })),
  ]

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'white', label: 'White' },
    { key: 'full', label: 'Full' },
    { key: 'occupancy', label: 'Occupancy' },
    { key: 'expense', label: 'Expense' },
  ]

  const paymentTotal = paymentRows.reduce((sum, r) => sum + r.amount, 0)
  const expenseTotal = expenseRows.reduce((sum, r) => sum + r.cost, 0)

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-gray-900">
          Reports & Export
        </h2>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Filters</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {(activeTab === 'white' || activeTab === 'full') && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tenant"
                  options={tenantOptions}
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                />
                <Select
                  label="Room"
                  options={roomOptions}
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                />
              </div>
            )}

            {activeTab === 'expense' && (
              <Select
                label="Room"
                options={roomOptions}
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              />
            )}
          </div>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* White Report / Full Report */}
            {(activeTab === 'white' || activeTab === 'full') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {activeTab === 'white'
                        ? 'White Report'
                        : 'Full Report'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {activeTab === 'white'
                        ? 'Digital payments only (for tax purposes)'
                        : 'All payments (cash + digital)'}
                    </p>
                  </div>
                  <Badge variant="blue">
                    {paymentRows.length} records
                  </Badge>
                </div>

                {paymentRows.length === 0 ? (
                  <Card>
                    <p className="text-center text-gray-400 py-6">
                      No payment records found for the selected filters.
                    </p>
                  </Card>
                ) : (
                  <Card className="overflow-x-auto !p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-100 bg-gray-50">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Tenant
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Month
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-600">
                            Amount
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Mode
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Date
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-600">
                            Late Fee
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentRows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {row.tenantName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {row.cycleMonth}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  row.mode === 'digital' ? 'blue' : 'yellow'
                                }
                              >
                                {row.mode}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {formatDate(row.paymentDate)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {row.lateFee > 0
                                ? formatCurrency(row.lateFee)
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td
                            colSpan={2}
                            className="px-3 py-2 font-bold text-gray-700"
                          >
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {formatCurrency(paymentTotal)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </Card>
                )}

                {paymentRows.length > 0 && (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        exportPaymentsPDF(
                          activeTab === 'white'
                            ? 'White Report'
                            : 'Full Report'
                        )
                      }
                    >
                      Export PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        exportPaymentsCSV(
                          activeTab === 'white'
                            ? 'white_report.csv'
                            : 'full_report.csv'
                        )
                      }
                    >
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Occupancy Report */}
            {activeTab === 'occupancy' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Occupancy Report
                    </h3>
                    <p className="text-sm text-gray-500">
                      Monthly occupancy snapshot
                    </p>
                  </div>
                  <Badge variant="green">
                    {occupancyRows.length} months
                  </Badge>
                </div>

                {occupancyRows.length === 0 ? (
                  <Card>
                    <p className="text-center text-gray-400 py-6">
                      No occupancy data available.
                    </p>
                  </Card>
                ) : (
                  <>
                    {/* Visual bar chart */}
                    <Card>
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Occupancy Rate
                      </p>
                      <div className="space-y-2">
                        {occupancyRows.map((row) => (
                          <div key={row.month} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-600 w-20 shrink-0">
                              {monthLabel(row.month)}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all flex items-center justify-end pr-2',
                                  row.occupancyRate >= 80
                                    ? 'bg-green-500'
                                    : row.occupancyRate >= 50
                                      ? 'bg-yellow-400'
                                      : 'bg-red-400'
                                )}
                                style={{
                                  width: `${Math.max(row.occupancyRate, 8)}%`,
                                }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {row.occupancyRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Table */}
                    <Card className="overflow-x-auto !p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-100 bg-gray-50">
                            <th className="text-left px-3 py-2 font-semibold text-gray-600">
                              Month
                            </th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-600">
                              Total Beds
                            </th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-600">
                              Occupied
                            </th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-600">
                              Empty
                            </th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-600">
                              Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {occupancyRows.map((row) => (
                            <tr
                              key={row.month}
                              className="border-b border-gray-50 hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {monthLabel(row.month)}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {row.totalBeds}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {row.occupied}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {row.empty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Badge
                                  variant={
                                    row.occupancyRate >= 80
                                      ? 'green'
                                      : row.occupancyRate >= 50
                                        ? 'yellow'
                                        : 'red'
                                  }
                                >
                                  {row.occupancyRate}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </>
                )}

                {occupancyRows.length > 0 && (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={exportOccupancyPDF}
                    >
                      Export PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={exportOccupancyCSV}
                    >
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Expense Report */}
            {activeTab === 'expense' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Expense Report
                    </h3>
                    <p className="text-sm text-gray-500">
                      Maintenance and repair costs
                    </p>
                  </div>
                  <Badge variant="red">
                    {expenseRows.length} entries
                  </Badge>
                </div>

                {expenseRows.length === 0 ? (
                  <Card>
                    <p className="text-center text-gray-400 py-6">
                      No expense records found for the selected filters.
                    </p>
                  </Card>
                ) : (
                  <Card className="overflow-x-auto !p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-100 bg-gray-50">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Room
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Description
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Date
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-600">
                            Cost
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {row.roomName}
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">
                              {row.description}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {formatDate(row.dateReported)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              {formatCurrency(row.cost)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  row.status === 'fixed'
                                    ? 'green'
                                    : row.status === 'in_progress'
                                      ? 'yellow'
                                      : 'red'
                                }
                              >
                                {row.status.replace('_', ' ')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td
                            colSpan={3}
                            className="px-3 py-2 font-bold text-gray-700"
                          >
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {formatCurrency(expenseTotal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </Card>
                )}

                {expenseRows.length > 0 && (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={exportExpensePDF}
                    >
                      Export PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={exportExpenseCSV}
                    >
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
