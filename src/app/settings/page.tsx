'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase-browser'
import type { ProrationType } from '@/types/database'

export default function SettingsPage() {
  const { t, language, setLanguage, ownerProfile, refreshProfile, user } = useApp()
  const supabase = createClient()
  const router = useRouter()

  // Profile form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [upiId, setUpiId] = useState('')

  // Rent preference
  const [rentProration, setRentProration] = useState<ProrationType>('full_month')

  // Notification preferences
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3)
  const [overdueAlertDays, setOverdueAlertDays] = useState(5)

  // Saving states
  const [savedSection, setSavedSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Populate form from ownerProfile
  useEffect(() => {
    if (ownerProfile) {
      setName(ownerProfile.name || '')
      setPhone(ownerProfile.phone || '')
      setPropertyName(ownerProfile.property_name || '')
      setPropertyAddress(ownerProfile.property_address || '')
      setUpiId(ownerProfile.upi_id || '')
      setRentProration(ownerProfile.rent_proration || 'full_month')
      setReminderDaysBefore(ownerProfile.reminder_days_before ?? 3)
      setOverdueAlertDays(ownerProfile.overdue_alert_days ?? 5)
    }
  }, [ownerProfile])

  const showSaved = (section: string) => {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2000)
  }

  const handleLanguageChange = async (lang: 'en' | 'kn') => {
    setLanguage(lang)
    if (ownerProfile) {
      await supabase
        .from('owner_profiles')
        .update({ language: lang })
        .eq('id', ownerProfile.id)
      await refreshProfile()
    }
    showSaved('language')
  }

  const handleProfileSave = async () => {
    if (!ownerProfile) return
    setSaving(true)
    await supabase
      .from('owner_profiles')
      .update({
        name,
        phone,
        property_name: propertyName,
        property_address: propertyAddress,
        upi_id: upiId || null,
      })
      .eq('id', ownerProfile.id)
    await refreshProfile()
    setSaving(false)
    showSaved('profile')
  }

  const handleRentPreferenceSave = async (value: ProrationType) => {
    setRentProration(value)
    if (!ownerProfile) return
    await supabase
      .from('owner_profiles')
      .update({ rent_proration: value })
      .eq('id', ownerProfile.id)
    await refreshProfile()
    showSaved('rent')
  }

  const handleNotificationSave = async () => {
    if (!ownerProfile) return
    setSaving(true)
    await supabase
      .from('owner_profiles')
      .update({
        reminder_days_before: reminderDaysBefore,
        overdue_alert_days: overdueAlertDays,
      })
      .eq('id', ownerProfile.id)
    await refreshProfile()
    setSaving(false)
    showSaved('notifications')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h2 className="text-2xl font-extrabold text-gray-900">{t('settings')}</h2>

        {/* 1. Language Toggle */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">Language / ಭಾಷೆ</h3>
            {savedSection === 'language' && (
              <span className="text-sm font-semibold text-green-600">Saved!</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('kn')}
              className={`py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                language === 'kn'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>
        </Card>

        {/* 2. Owner Profile */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Owner Profile</h3>
            {savedSection === 'profile' && (
              <span className="text-sm font-semibold text-green-600">Saved!</span>
            )}
          </div>
          <div className="space-y-4">
            <Input
              label="Owner Name"
              id="owner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
            <Input
              label="Phone"
              id="owner-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
            <Input
              label="Property Name"
              id="property-name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. Namma PG for Men"
            />
            <div className="w-full">
              <label htmlFor="property-address" className="block text-sm font-semibold text-gray-700 mb-1">
                Property Address
              </label>
              <textarea
                id="property-address"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="Full property address"
                rows={3}
                className="w-full px-4 py-3 text-base border-2 rounded-xl bg-white transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300"
              />
            </div>
            <div>
              <Input
                label="UPI ID"
                id="upi-id"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used to generate payment QR code on tenant profiles
              </p>
            </div>
            <Button onClick={handleProfileSave} disabled={saving} size="lg">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </Card>

        {/* 3. Rent Preference */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">Rent Preference</h3>
            {savedSection === 'rent' && (
              <span className="text-sm font-semibold text-green-600">Saved!</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            When a tenant moves in mid-month, charge full month or pro-rate?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRentPreferenceSave('full_month')}
              className={`py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                rentProration === 'full_month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Full Month
            </button>
            <button
              onClick={() => handleRentPreferenceSave('pro_rated')}
              className={`py-3 px-4 rounded-xl text-base font-semibold transition-all ${
                rentProration === 'pro_rated'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pro-Rated
            </button>
          </div>
        </Card>

        {/* 4. Notification Preferences */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Notification Preferences</h3>
            {savedSection === 'notifications' && (
              <span className="text-sm font-semibold text-green-600">Saved!</span>
            )}
          </div>
          <div className="space-y-4">
            <Input
              label="Reminder days before due date"
              id="reminder-days"
              type="number"
              min={0}
              max={30}
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
            />
            <Input
              label="Overdue alert days after due date"
              id="overdue-days"
              type="number"
              min={0}
              max={30}
              value={overdueAlertDays}
              onChange={(e) => setOverdueAlertDays(Number(e.target.value))}
            />
            <Button onClick={handleNotificationSave} disabled={saving} size="lg">
              {saving ? 'Saving...' : 'Save Notifications'}
            </Button>
          </div>
        </Card>

        {/* 5. Logout */}
        <Card>
          <Button variant="danger" size="lg" onClick={handleLogout}>
            Logout
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
