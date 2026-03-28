-- NammaPG Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- OWNER PROFILES
-- ============================================
CREATE TABLE owner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  property_name TEXT NOT NULL DEFAULT '',
  property_address TEXT NOT NULL DEFAULT '',
  upi_id TEXT,
  rent_proration TEXT NOT NULL DEFAULT 'full_month' CHECK (rent_proration IN ('full_month', 'pro_rated')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'kn')),
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  overdue_alert_days INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- MANAGER PROFILES (optional second role)
-- ============================================
CREATE TABLE manager_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- FLOORS
-- ============================================
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROOMS
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bed_count INTEGER NOT NULL CHECK (bed_count >= 1 AND bed_count <= 5),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BEDS
-- ============================================
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied', 'blocked', 'notice_period')),
  tenant_id UUID, -- FK added after tenants table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  photo_url TEXT,
  aadhaar_number TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  move_in_date DATE NOT NULL,
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  room_type TEXT NOT NULL DEFAULT 'shared' CHECK (room_type IN ('shared', 'private')),
  monthly_rent INTEGER NOT NULL, -- in paise
  security_deposit INTEGER NOT NULL DEFAULT 0, -- in paise
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notice_period', 'checked_out')),
  notice_start_date DATE,
  expected_checkout_date DATE,
  actual_checkout_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from beds to tenants
ALTER TABLE beds ADD CONSTRAINT beds_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- ============================================
-- RENT CYCLES (what is owed each month)
-- ============================================
CREATE TABLE rent_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  cycle_month TEXT NOT NULL, -- 'YYYY-MM' format
  due_date DATE NOT NULL,
  amount_due INTEGER NOT NULL, -- in paise
  amount_paid INTEGER NOT NULL DEFAULT 0, -- in paise
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  is_prorated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, cycle_month)
);

-- ============================================
-- PAYMENTS (what was actually received)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rent_cycle_id UUID NOT NULL REFERENCES rent_cycles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in paise
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'digital')),
  payment_date DATE NOT NULL,
  late_fee INTEGER NOT NULL DEFAULT 0, -- in paise
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DEPOSIT INSTALLMENTS
-- ============================================
CREATE TABLE deposit_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in paise
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'digital')),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SETTLEMENTS (triggered on check-out)
-- ============================================
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  total_deposit_collected INTEGER NOT NULL DEFAULT 0, -- paise
  total_unpaid_rent INTEGER NOT NULL DEFAULT 0, -- paise
  damages_deduction INTEGER NOT NULL DEFAULT 0, -- paise
  damages_notes TEXT,
  refund_amount INTEGER NOT NULL DEFAULT 0, -- paise
  settlement_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MAINTENANCE LOGS
-- ============================================
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  reported_by_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  reported_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL,
  photo_before_url TEXT,
  photo_after_url TEXT,
  repair_cost INTEGER, -- paise
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'fixed')),
  date_reported DATE NOT NULL,
  date_fixed DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Owner can see/edit their own data
CREATE POLICY "owner_all" ON owner_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "manager_read" ON manager_profiles FOR SELECT USING (
  owner_id IN (SELECT id FROM owner_profiles WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "manager_write" ON manager_profiles FOR ALL USING (
  owner_id IN (SELECT id FROM owner_profiles WHERE user_id = auth.uid())
);

-- Helper function to get owner_id for current user
CREATE OR REPLACE FUNCTION get_my_owner_id()
RETURNS UUID AS $$
  SELECT id FROM owner_profiles WHERE user_id = auth.uid()
  UNION
  SELECT owner_id FROM manager_profiles WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Apply RLS policies using get_my_owner_id()
CREATE POLICY "floors_all" ON floors FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "rooms_all" ON rooms FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "beds_all" ON beds FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "tenants_all" ON tenants FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "rent_cycles_all" ON rent_cycles FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "payments_all" ON payments FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "deposits_all" ON deposit_installments FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "settlements_all" ON settlements FOR ALL USING (owner_id = get_my_owner_id());
CREATE POLICY "maintenance_all" ON maintenance_logs FOR ALL USING (owner_id = get_my_owner_id());

-- ============================================
-- AUTO-CREATE OWNER PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO owner_profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON owner_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON rent_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON maintenance_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_floors_owner ON floors(owner_id);
CREATE INDEX idx_rooms_floor ON rooms(floor_id);
CREATE INDEX idx_rooms_owner ON rooms(owner_id);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_tenant ON beds(tenant_id);
CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_tenants_bed ON tenants(bed_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_rent_cycles_tenant ON rent_cycles(tenant_id);
CREATE INDEX idx_rent_cycles_month ON rent_cycles(cycle_month);
CREATE INDEX idx_rent_cycles_status ON rent_cycles(status);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_cycle ON payments(rent_cycle_id);
CREATE INDEX idx_payments_mode ON payments(mode);
CREATE INDEX idx_deposits_tenant ON deposit_installments(tenant_id);
CREATE INDEX idx_settlements_tenant ON settlements(tenant_id);
CREATE INDEX idx_maintenance_room ON maintenance_logs(room_id);
CREATE INDEX idx_maintenance_status ON maintenance_logs(status);

-- ============================================
-- STORAGE BUCKETS (run in Supabase Dashboard → Storage)
-- ============================================
-- Create these buckets manually in Supabase Dashboard:
-- 1. "tenant-photos" - for tenant profile photos
-- 2. "aadhaar-docs" - for Aadhaar uploads
-- 3. "maintenance-photos" - for maintenance before/after photos
