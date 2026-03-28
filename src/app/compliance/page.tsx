'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { formatDate, maskAadhaar } from '@/lib/utils'
import { mockTenants } from '@/lib/mock-data'
import jsPDF from 'jspdf'

export default function CompliancePageWrapper() {
  return (
    <Suspense>
      <CompliancePage />
    </Suspense>
  )
}

function CompliancePage() {
  const { t, ownerProfile } = useApp()
  const searchParams = useSearchParams()

  const tenants = mockTenants.filter((t) => t.status === 'active' || t.status === 'notice_period')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  useEffect(() => {
    const tenantParam = searchParams.get('tenant')
    if (tenantParam) setSelectedTenantId(tenantParam)
  }, [searchParams])

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId)

  function generateForm12PDF() {
    if (!selectedTenant || !ownerProfile) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('FORM 12', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(
      '(Karnataka Police Act - Information of Tenant / Paying Guest)',
      pageWidth / 2,
      28,
      { align: 'center' }
    )

    doc.setLineWidth(0.5)
    doc.line(14, 32, pageWidth - 14, 32)

    let y = 44
    const leftCol = 14
    const rightCol = 80
    const lineHeight = 10

    const addField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ':', leftCol, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value || 'N/A', rightCol, y)
      y += lineHeight
    }

    // Section: Tenant Details
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Tenant / Paying Guest Details', leftCol, y)
    y += lineHeight

    doc.setFontSize(11)
    addField('Full Name', selectedTenant.full_name)
    addField('Phone Number', selectedTenant.phone)
    addField(
      'Aadhaar Number',
      selectedTenant.aadhaar_number
        ? maskAadhaar(selectedTenant.aadhaar_number)
        : 'Not provided'
    )
    addField('Move-In Date', formatDate(selectedTenant.move_in_date))
    addField(
      'Room Type',
      selectedTenant.room_type === 'private' ? 'Private Room' : 'Shared Room'
    )

    y += 5

    // Section: Property Details
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Property / Owner Details', leftCol, y)
    y += lineHeight

    doc.setFontSize(11)
    addField('Property Name', ownerProfile.property_name)
    addField('Property Address', ownerProfile.property_address)
    addField('Owner Name', ownerProfile.name)
    addField('Owner Phone', ownerProfile.phone)

    y += 10

    // Emergency Contact
    if (
      selectedTenant.emergency_contact_name ||
      selectedTenant.emergency_contact_phone
    ) {
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Emergency Contact', leftCol, y)
      y += lineHeight

      doc.setFontSize(11)
      addField('Name', selectedTenant.emergency_contact_name || 'N/A')
      addField('Phone', selectedTenant.emergency_contact_phone || 'N/A')
    }

    y += 15

    // Signature lines
    doc.setLineWidth(0.3)
    doc.line(14, y, 80, y)
    doc.text('Signature of Tenant', 14, y + 6)

    doc.line(pageWidth - 80, y, pageWidth - 14, y)
    doc.text('Signature of Owner', pageWidth - 80, y + 6)

    y += 20

    // Date
    doc.setFontSize(10)
    doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, leftCol, y)

    doc.save(`Form12_${selectedTenant.full_name.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-gray-900">{t('compliance')}</h2>

        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('form12Title')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('form12Subtitle')}</p>

          <Select
            label={t('tenants')}
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            options={[
              { value: '', label: `-- ${t('selectBed')} --` },
              ...tenants.map((tn) => ({
                value: tn.id,
                label: tn.full_name,
              })),
            ]}
          />
        </Card>

        {selectedTenant && (
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              {t('printForm12')} — {selectedTenant.full_name}
            </h3>

            {/* Preview */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 space-y-3 text-sm">
              <div className="text-center font-bold text-base">FORM 12</div>
              <div className="text-center text-xs text-gray-500">
                Karnataka Police Act - Information of Tenant
              </div>
              <hr />

              <div className="font-bold text-gray-700 mt-2">
                Tenant Details
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-semibold text-gray-600">
                  {t('fullName')}:
                </span>
                <span>{selectedTenant.full_name}</span>

                <span className="font-semibold text-gray-600">
                  {t('phone')}:
                </span>
                <span>{selectedTenant.phone}</span>

                <span className="font-semibold text-gray-600">
                  {t('aadhaarNumber')}:
                </span>
                <span>
                  {selectedTenant.aadhaar_number
                    ? maskAadhaar(selectedTenant.aadhaar_number)
                    : 'N/A'}
                </span>

                <span className="font-semibold text-gray-600">
                  {t('moveInDate')}:
                </span>
                <span>{formatDate(selectedTenant.move_in_date)}</span>

                <span className="font-semibold text-gray-600">
                  {t('roomType')}:
                </span>
                <span>
                  {selectedTenant.room_type === 'private'
                    ? t('private')
                    : t('shared')}
                </span>
              </div>

              <div className="font-bold text-gray-700 mt-2">
                Property Details
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-semibold text-gray-600">
                  {t('propertyName')}:
                </span>
                <span>{ownerProfile?.property_name || 'N/A'}</span>

                <span className="font-semibold text-gray-600">
                  {t('propertyAddress')}:
                </span>
                <span>{ownerProfile?.property_address || 'N/A'}</span>

                <span className="font-semibold text-gray-600">
                  {t('ownerName')}:
                </span>
                <span>{ownerProfile?.name || 'N/A'}</span>

                <span className="font-semibold text-gray-600">
                  {t('phone')}:
                </span>
                <span>{ownerProfile?.phone || 'N/A'}</span>
              </div>
            </div>

            <Button size="lg" onClick={generateForm12PDF}>
              {t('printForm12')} (PDF)
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
