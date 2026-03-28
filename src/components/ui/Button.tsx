'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
          variant === 'secondary' && 'bg-gray-200 text-gray-800 hover:bg-gray-300',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 shadow-md',
          variant === 'ghost' && 'bg-transparent text-gray-600 hover:bg-gray-100',
          variant === 'success' && 'bg-green-600 text-white hover:bg-green-700 shadow-md',
          size === 'sm' && 'px-3 py-2 text-sm min-h-[36px]',
          size === 'md' && 'px-5 py-3 text-base min-h-[48px]',
          size === 'lg' && 'px-6 py-4 text-lg min-h-[56px] w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
