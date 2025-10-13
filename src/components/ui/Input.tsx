import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  // Quando true, normaliza números com vírgula/ponto e expõe string no input
  numeric?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', numeric, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!numeric) {
        onChange?.(e)
        return
      }
      const raw = e.target.value
      const normalized = raw.replace(/\./g, '').replace(',', '.')
      const next = normalized === '' ? '' : normalized
      const synthetic = {
        ...e,
        target: { ...e.target, value: next }
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(synthetic)
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <input
          type={numeric ? 'text' : type}
          inputMode={numeric ? 'decimal' : props.inputMode}
          ref={ref}
          className={cn(
            'w-full px-3 py-2.5 text-sm border border-border-gray rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'placeholder:text-text-secondary/50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          value={value as any}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

