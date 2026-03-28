// Format paise to INR display string
export function formatCurrency(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

// Parse INR string input to paise
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

// Parse paise to rupees
export function toRupees(paise: number): number {
  return paise / 100
}

// Format date for display
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Mask Aadhaar number: XXXX-XXXX-1234
export function maskAadhaar(aadhaar: string): string {
  const clean = aadhaar.replace(/\s|-/g, '')
  if (clean.length !== 12) return aadhaar
  return `XXXX-XXXX-${clean.slice(8)}`
}

// Calculate pro-rated rent
export function calculateProratedRent(
  monthlyRent: number,
  moveInDate: string
): number {
  const date = new Date(moveInDate)
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate()
  const remainingDays = daysInMonth - date.getDate() + 1
  return Math.round((monthlyRent / daysInMonth) * remainingDays)
}

// Get due date for a given month based on move-in date
export function getDueDate(moveInDate: string, year: number, month: number): Date {
  const moveIn = new Date(moveInDate)
  const day = moveIn.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const actualDay = Math.min(day, daysInMonth)
  return new Date(year, month, actualDay)
}

// Check if rent is overdue (more than 5 days past due)
export function isOverdue(dueDate: string, daysThreshold = 5): boolean {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = now.getTime() - due.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > daysThreshold
}

// Generate a month label like "Mar 2026"
export function monthLabel(cycleMonth: string): string {
  const [year, month] = cycleMonth.split('-').map(Number)
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

// cn utility for conditional classnames
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
