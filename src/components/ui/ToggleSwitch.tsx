'use client'

import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label?: string
  disabled?: boolean
}

export default function ToggleSwitch({ enabled, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <label className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 border-transparent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow transform transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
    </label>
  )
}
