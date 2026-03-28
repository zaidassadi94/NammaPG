import type {
  OwnerProfile,
  Floor,
  Room,
  Bed,
  Tenant,
  RentCycle,
  Payment,
  DepositInstallment,
  MaintenanceLog,
} from '@/types/database'

const OWNER_ID = 'mock-owner-001'

export const mockOwnerProfile: OwnerProfile = {
  id: OWNER_ID,
  user_id: 'mock-user-001',
  name: 'Rajesh Kumar',
  phone: '9876543210',
  property_name: 'Kumar PG',
  property_address: '42, 2nd Cross, Koramangala, Bangalore - 560034',
  upi_id: 'rajesh@upi',
  rent_proration: 'full_month',
  language: 'en',
  reminder_days_before: 3,
  overdue_alert_days: 5,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const mockFloors: Floor[] = [
  { id: 'floor-1', owner_id: OWNER_ID, name: 'Ground Floor', sort_order: 0, created_at: '2025-01-01T00:00:00Z' },
  { id: 'floor-2', owner_id: OWNER_ID, name: 'First Floor', sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
  { id: 'floor-3', owner_id: OWNER_ID, name: 'Second Floor', sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
]

export const mockRooms: Room[] = [
  { id: 'room-1', floor_id: 'floor-1', owner_id: OWNER_ID, name: 'Room 101', bed_count: 3, is_private: false, sort_order: 0, created_at: '2025-01-01T00:00:00Z' },
  { id: 'room-2', floor_id: 'floor-1', owner_id: OWNER_ID, name: 'Room 102', bed_count: 2, is_private: true, sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
  { id: 'room-3', floor_id: 'floor-2', owner_id: OWNER_ID, name: 'Room 201', bed_count: 3, is_private: false, sort_order: 0, created_at: '2025-01-01T00:00:00Z' },
  { id: 'room-4', floor_id: 'floor-2', owner_id: OWNER_ID, name: 'Room 202', bed_count: 2, is_private: false, sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
  { id: 'room-5', floor_id: 'floor-3', owner_id: OWNER_ID, name: 'Room 301', bed_count: 3, is_private: false, sort_order: 0, created_at: '2025-01-01T00:00:00Z' },
]

export const mockBeds: Bed[] = [
  // Room 101 - 3 beds (2 occupied, 1 empty)
  { id: 'bed-1', room_id: 'room-1', owner_id: OWNER_ID, label: 'Bed 1', status: 'occupied', tenant_id: 'tenant-1', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-2', room_id: 'room-1', owner_id: OWNER_ID, label: 'Bed 2', status: 'occupied', tenant_id: 'tenant-2', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-3', room_id: 'room-1', owner_id: OWNER_ID, label: 'Bed 3', status: 'empty', tenant_id: null, created_at: '2025-01-01T00:00:00Z' },
  // Room 102 - 2 beds (private, blocked, 1 tenant)
  { id: 'bed-4', room_id: 'room-2', owner_id: OWNER_ID, label: 'Bed 1', status: 'blocked', tenant_id: 'tenant-3', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-5', room_id: 'room-2', owner_id: OWNER_ID, label: 'Bed 2', status: 'blocked', tenant_id: 'tenant-3', created_at: '2025-01-01T00:00:00Z' },
  // Room 201 - 3 beds (1 occupied, 1 notice, 1 empty)
  { id: 'bed-6', room_id: 'room-3', owner_id: OWNER_ID, label: 'Bed 1', status: 'occupied', tenant_id: 'tenant-4', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-7', room_id: 'room-3', owner_id: OWNER_ID, label: 'Bed 2', status: 'notice_period', tenant_id: 'tenant-5', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-8', room_id: 'room-3', owner_id: OWNER_ID, label: 'Bed 3', status: 'empty', tenant_id: null, created_at: '2025-01-01T00:00:00Z' },
  // Room 202 - 2 beds (all empty)
  { id: 'bed-9', room_id: 'room-4', owner_id: OWNER_ID, label: 'Bed 1', status: 'empty', tenant_id: null, created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-10', room_id: 'room-4', owner_id: OWNER_ID, label: 'Bed 2', status: 'empty', tenant_id: null, created_at: '2025-01-01T00:00:00Z' },
  // Room 301 - 3 beds (2 occupied, 1 empty)
  { id: 'bed-11', room_id: 'room-5', owner_id: OWNER_ID, label: 'Bed 1', status: 'occupied', tenant_id: 'tenant-6', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-12', room_id: 'room-5', owner_id: OWNER_ID, label: 'Bed 2', status: 'occupied', tenant_id: 'tenant-7', created_at: '2025-01-01T00:00:00Z' },
  { id: 'bed-13', room_id: 'room-5', owner_id: OWNER_ID, label: 'Bed 3', status: 'empty', tenant_id: null, created_at: '2025-01-01T00:00:00Z' },
]

export const mockTenants: Tenant[] = [
  {
    id: 'tenant-1', owner_id: OWNER_ID, full_name: 'Amit Sharma', phone: '9876500001',
    emergency_contact_name: 'Suresh Sharma', emergency_contact_phone: '9876500010',
    photo_url: null, aadhaar_number: '234567891234', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-09-07', notice_period_days: 30, bed_id: 'bed-1', room_type: 'shared',
    monthly_rent: 800000, security_deposit: 1600000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2025-09-07T00:00:00Z', updated_at: '2025-09-07T00:00:00Z',
  },
  {
    id: 'tenant-2', owner_id: OWNER_ID, full_name: 'Priya Patel', phone: '9876500002',
    emergency_contact_name: 'Meena Patel', emergency_contact_phone: '9876500020',
    photo_url: null, aadhaar_number: '345678912345', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-10-15', notice_period_days: 30, bed_id: 'bed-2', room_type: 'shared',
    monthly_rent: 800000, security_deposit: 1600000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2025-10-15T00:00:00Z', updated_at: '2025-10-15T00:00:00Z',
  },
  {
    id: 'tenant-3', owner_id: OWNER_ID, full_name: 'Vikram Reddy', phone: '9876500003',
    emergency_contact_name: 'Lakshmi Reddy', emergency_contact_phone: '9876500030',
    photo_url: null, aadhaar_number: '456789123456', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-08-01', notice_period_days: 30, bed_id: 'bed-4', room_type: 'private',
    monthly_rent: 1500000, security_deposit: 3000000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2025-08-01T00:00:00Z', updated_at: '2025-08-01T00:00:00Z',
  },
  {
    id: 'tenant-4', owner_id: OWNER_ID, full_name: 'Sneha Iyer', phone: '9876500004',
    emergency_contact_name: 'Ravi Iyer', emergency_contact_phone: '9876500040',
    photo_url: null, aadhaar_number: '567891234567', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-11-01', notice_period_days: 30, bed_id: 'bed-6', room_type: 'shared',
    monthly_rent: 750000, security_deposit: 1500000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2025-11-01T00:00:00Z', updated_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'tenant-5', owner_id: OWNER_ID, full_name: 'Rahul Nair', phone: '9876500005',
    emergency_contact_name: 'Sanjay Nair', emergency_contact_phone: '9876500050',
    photo_url: null, aadhaar_number: '678912345678', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-07-10', notice_period_days: 30, bed_id: 'bed-7', room_type: 'shared',
    monthly_rent: 750000, security_deposit: 1500000, status: 'notice_period',
    notice_start_date: '2026-03-15', expected_checkout_date: '2026-04-14', actual_checkout_date: null,
    created_at: '2025-07-10T00:00:00Z', updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'tenant-6', owner_id: OWNER_ID, full_name: 'Deepa Rao', phone: '9876500006',
    emergency_contact_name: 'Kiran Rao', emergency_contact_phone: '9876500060',
    photo_url: null, aadhaar_number: '789123456789', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2025-12-01', notice_period_days: 30, bed_id: 'bed-11', room_type: 'shared',
    monthly_rent: 700000, security_deposit: 1400000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2025-12-01T00:00:00Z', updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'tenant-7', owner_id: OWNER_ID, full_name: 'Karthik Gowda', phone: '9876500007',
    emergency_contact_name: 'Sunil Gowda', emergency_contact_phone: '9876500070',
    photo_url: null, aadhaar_number: '891234567890', aadhaar_front_url: null, aadhaar_back_url: null,
    move_in_date: '2026-01-05', notice_period_days: 30, bed_id: 'bed-12', room_type: 'shared',
    monthly_rent: 700000, security_deposit: 1400000, status: 'active',
    notice_start_date: null, expected_checkout_date: null, actual_checkout_date: null,
    created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
  },
]

// Rent cycles — some paid, some pending, some overdue
export const mockRentCycles: RentCycle[] = [
  // Amit Sharma - due 7th each month, March overdue
  { id: 'rc-1', tenant_id: 'tenant-1', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-07', amount_due: 800000, amount_paid: 0, status: 'pending', is_prorated: false, created_at: '2026-03-07T00:00:00Z', updated_at: '2026-03-07T00:00:00Z' },
  { id: 'rc-2', tenant_id: 'tenant-1', owner_id: OWNER_ID, cycle_month: '2026-02', due_date: '2026-02-07', amount_due: 800000, amount_paid: 800000, status: 'paid', is_prorated: false, created_at: '2026-02-07T00:00:00Z', updated_at: '2026-02-10T00:00:00Z' },
  { id: 'rc-3', tenant_id: 'tenant-1', owner_id: OWNER_ID, cycle_month: '2026-01', due_date: '2026-01-07', amount_due: 800000, amount_paid: 800000, status: 'paid', is_prorated: false, created_at: '2026-01-07T00:00:00Z', updated_at: '2026-01-08T00:00:00Z' },
  // Priya Patel - partial payment for March
  { id: 'rc-4', tenant_id: 'tenant-2', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-15', amount_due: 800000, amount_paid: 400000, status: 'partial', is_prorated: false, created_at: '2026-03-15T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'rc-5', tenant_id: 'tenant-2', owner_id: OWNER_ID, cycle_month: '2026-02', due_date: '2026-02-15', amount_due: 800000, amount_paid: 800000, status: 'paid', is_prorated: false, created_at: '2026-02-15T00:00:00Z', updated_at: '2026-02-16T00:00:00Z' },
  // Vikram Reddy - overdue March
  { id: 'rc-6', tenant_id: 'tenant-3', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-01', amount_due: 1500000, amount_paid: 0, status: 'pending', is_prorated: false, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
  // Sneha Iyer - paid
  { id: 'rc-7', tenant_id: 'tenant-4', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-01', amount_due: 750000, amount_paid: 750000, status: 'paid', is_prorated: false, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-02T00:00:00Z' },
  // Rahul Nair - notice period, March paid
  { id: 'rc-8', tenant_id: 'tenant-5', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-10', amount_due: 750000, amount_paid: 750000, status: 'paid', is_prorated: false, created_at: '2026-03-10T00:00:00Z', updated_at: '2026-03-10T00:00:00Z' },
  // Deepa Rao - March overdue
  { id: 'rc-9', tenant_id: 'tenant-6', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-01', amount_due: 700000, amount_paid: 0, status: 'pending', is_prorated: false, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
  // Karthik Gowda - paid March
  { id: 'rc-10', tenant_id: 'tenant-7', owner_id: OWNER_ID, cycle_month: '2026-03', due_date: '2026-03-05', amount_due: 700000, amount_paid: 700000, status: 'paid', is_prorated: false, created_at: '2026-03-05T00:00:00Z', updated_at: '2026-03-06T00:00:00Z' },
]

export const mockPayments: Payment[] = [
  { id: 'pay-1', rent_cycle_id: 'rc-2', tenant_id: 'tenant-1', owner_id: OWNER_ID, amount: 800000, mode: 'digital', payment_date: '2026-02-10', late_fee: 0, notes: null, created_at: '2026-02-10T00:00:00Z' },
  { id: 'pay-2', rent_cycle_id: 'rc-3', tenant_id: 'tenant-1', owner_id: OWNER_ID, amount: 800000, mode: 'cash', payment_date: '2026-01-08', late_fee: 0, notes: null, created_at: '2026-01-08T00:00:00Z' },
  { id: 'pay-3', rent_cycle_id: 'rc-4', tenant_id: 'tenant-2', owner_id: OWNER_ID, amount: 400000, mode: 'digital', payment_date: '2026-03-16', late_fee: 0, notes: 'Partial - will pay rest next week', created_at: '2026-03-16T00:00:00Z' },
  { id: 'pay-4', rent_cycle_id: 'rc-5', tenant_id: 'tenant-2', owner_id: OWNER_ID, amount: 800000, mode: 'digital', payment_date: '2026-02-16', late_fee: 0, notes: null, created_at: '2026-02-16T00:00:00Z' },
  { id: 'pay-5', rent_cycle_id: 'rc-7', tenant_id: 'tenant-4', owner_id: OWNER_ID, amount: 750000, mode: 'cash', payment_date: '2026-03-02', late_fee: 0, notes: null, created_at: '2026-03-02T00:00:00Z' },
  { id: 'pay-6', rent_cycle_id: 'rc-8', tenant_id: 'tenant-5', owner_id: OWNER_ID, amount: 750000, mode: 'digital', payment_date: '2026-03-10', late_fee: 0, notes: null, created_at: '2026-03-10T00:00:00Z' },
  { id: 'pay-7', rent_cycle_id: 'rc-10', tenant_id: 'tenant-7', owner_id: OWNER_ID, amount: 700000, mode: 'cash', payment_date: '2026-03-06', late_fee: 0, notes: null, created_at: '2026-03-06T00:00:00Z' },
]

export const mockDepositInstallments: DepositInstallment[] = [
  { id: 'dep-1', tenant_id: 'tenant-1', owner_id: OWNER_ID, amount: 1600000, mode: 'cash', payment_date: '2025-09-07', notes: 'Full deposit', created_at: '2025-09-07T00:00:00Z' },
  { id: 'dep-2', tenant_id: 'tenant-2', owner_id: OWNER_ID, amount: 800000, mode: 'digital', payment_date: '2025-10-15', notes: 'First installment', created_at: '2025-10-15T00:00:00Z' },
  { id: 'dep-3', tenant_id: 'tenant-2', owner_id: OWNER_ID, amount: 800000, mode: 'digital', payment_date: '2025-11-15', notes: 'Second installment', created_at: '2025-11-15T00:00:00Z' },
  { id: 'dep-4', tenant_id: 'tenant-3', owner_id: OWNER_ID, amount: 3000000, mode: 'digital', payment_date: '2025-08-01', notes: 'Full deposit', created_at: '2025-08-01T00:00:00Z' },
  { id: 'dep-5', tenant_id: 'tenant-4', owner_id: OWNER_ID, amount: 1500000, mode: 'cash', payment_date: '2025-11-01', notes: 'Full deposit', created_at: '2025-11-01T00:00:00Z' },
  { id: 'dep-6', tenant_id: 'tenant-5', owner_id: OWNER_ID, amount: 1500000, mode: 'digital', payment_date: '2025-07-10', notes: 'Full deposit', created_at: '2025-07-10T00:00:00Z' },
  { id: 'dep-7', tenant_id: 'tenant-6', owner_id: OWNER_ID, amount: 700000, mode: 'cash', payment_date: '2025-12-01', notes: 'First installment', created_at: '2025-12-01T00:00:00Z' },
  { id: 'dep-8', tenant_id: 'tenant-7', owner_id: OWNER_ID, amount: 1400000, mode: 'digital', payment_date: '2026-01-05', notes: 'Full deposit', created_at: '2026-01-05T00:00:00Z' },
]

export const mockMaintenanceLogs: MaintenanceLog[] = [
  {
    id: 'maint-1', room_id: 'room-1', owner_id: OWNER_ID, reported_by_tenant_id: 'tenant-1',
    reported_by_owner: false, description: 'Bathroom tap leaking', photo_before_url: null, photo_after_url: null,
    repair_cost: 150000, status: 'fixed', date_reported: '2026-02-20', date_fixed: '2026-02-22',
    created_at: '2026-02-20T00:00:00Z', updated_at: '2026-02-22T00:00:00Z',
  },
  {
    id: 'maint-2', room_id: 'room-3', owner_id: OWNER_ID, reported_by_tenant_id: 'tenant-5',
    reported_by_owner: false, description: 'Window glass cracked', photo_before_url: null, photo_after_url: null,
    repair_cost: 250000, status: 'in_progress', date_reported: '2026-03-18', date_fixed: null,
    created_at: '2026-03-18T00:00:00Z', updated_at: '2026-03-20T00:00:00Z',
  },
  {
    id: 'maint-3', room_id: 'room-5', owner_id: OWNER_ID, reported_by_tenant_id: null,
    reported_by_owner: true, description: 'Ceiling fan not working', photo_before_url: null, photo_after_url: null,
    repair_cost: null, status: 'reported', date_reported: '2026-03-25', date_fixed: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
]
