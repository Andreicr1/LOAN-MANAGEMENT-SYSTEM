import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format as dateFnsFormat } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DECISION: US format for all money and dates
export function formatMoney(amount: number, options?: { withSymbol?: boolean }): string {
  const { withSymbol = false } = options ?? {}
  const absolute = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute)
  const prefix = amount < 0 ? '-' : ''
  if (withSymbol) {
    return `${prefix}$${formatted}`
  }
  return `${prefix}${formatted}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return dateFnsFormat(d, 'MM/dd/yyyy') // US format
  } catch {
    return '-'
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return dateFnsFormat(d, 'MM/dd/yyyy HH:mm:ss')
  } catch {
    return '-'
  }
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

