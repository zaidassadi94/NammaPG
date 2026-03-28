export type UserRole = 'owner' | 'manager'

export type BedStatus = 'empty' | 'occupied' | 'blocked' | 'notice_period'

export type TenantStatus = 'active' | 'notice_period' | 'checked_out'

export type RentCycleStatus = 'pending' | 'partial' | 'paid'

export type PaymentMode = 'cash' | 'digital'

export type MaintenanceStatus = 'reported' | 'in_progress' | 'fixed'

export type ProrationType = 'full_month' | 'pro_rated'

export interface OwnerProfile {
  id: string
  user_id: string
  name: string
  phone: string
  property_name: string
  property_address: string
  upi_id: string | null
  rent_proration: ProrationType
  language: 'en' | 'kn'
  reminder_days_before: number
  overdue_alert_days: number
  created_at: string
  updated_at: string
}

export interface Floor {
  id: string
  owner_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Room {
  id: string
  floor_id: string
  owner_id: string
  name: string
  bed_count: number
  is_private: boolean
  sort_order: number
  created_at: string
}

export interface Bed {
  id: string
  room_id: string
  owner_id: string
  label: string
  status: BedStatus
  tenant_id: string | null
  created_at: string
}

export interface Tenant {
  id: string
  owner_id: string
  full_name: string
  phone: string
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  photo_url: string | null
  aadhaar_number: string | null
  aadhaar_front_url: string | null
  aadhaar_back_url: string | null
  move_in_date: string
  notice_period_days: number
  bed_id: string | null
  room_type: 'shared' | 'private'
  monthly_rent: number // in paise
  security_deposit: number // in paise
  status: TenantStatus
  notice_start_date: string | null
  expected_checkout_date: string | null
  actual_checkout_date: string | null
  created_at: string
  updated_at: string
}

export interface RentCycle {
  id: string
  tenant_id: string
  owner_id: string
  cycle_month: string // YYYY-MM format
  due_date: string
  amount_due: number // in paise
  amount_paid: number // in paise
  status: RentCycleStatus
  is_prorated: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  rent_cycle_id: string
  tenant_id: string
  owner_id: string
  amount: number // in paise
  mode: PaymentMode
  payment_date: string
  late_fee: number // in paise
  notes: string | null
  created_at: string
}

export interface DepositInstallment {
  id: string
  tenant_id: string
  owner_id: string
  amount: number // in paise
  mode: PaymentMode
  payment_date: string
  notes: string | null
  created_at: string
}

export interface Settlement {
  id: string
  tenant_id: string
  owner_id: string
  total_deposit_collected: number // paise
  total_unpaid_rent: number // paise
  damages_deduction: number // paise
  damages_notes: string | null
  refund_amount: number // paise
  settlement_date: string
  created_at: string
}

export interface MaintenanceLog {
  id: string
  room_id: string
  owner_id: string
  reported_by_tenant_id: string | null
  reported_by_owner: boolean
  description: string
  photo_before_url: string | null
  photo_after_url: string | null
  repair_cost: number | null // paise
  status: MaintenanceStatus
  date_reported: string
  date_fixed: string | null
  created_at: string
  updated_at: string
}

// Joined types for UI display
export interface BedWithDetails extends Bed {
  room?: Room
  tenant?: Tenant
}

export interface RoomWithBeds extends Room {
  beds: Bed[]
  floor?: Floor
}

export interface FloorWithRooms extends Floor {
  rooms: RoomWithBeds[]
}

export interface TenantWithBed extends Tenant {
  bed?: Bed & { room?: Room & { floor?: Floor } }
}

export interface RentCycleWithPayments extends RentCycle {
  payments: Payment[]
  tenant?: Tenant
}
