import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeColors {
  primary: string
  primaryDark: string
  primaryLight: string
  primarySubtle: string
}

interface ThemeContextType {
  colors: ThemeColors
  updateColors: (colors: Partial<ThemeColors>) => void
  resetColors: () => void
}

const defaultColors: ThemeColors = {
  primary: '#0a3c10',
  primaryDark: '#062209',
  primaryLight: '#1dd55c',
  primarySubtle: '#edf3ed',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>(() => {
    // Load saved colors from localStorage
    const saved = localStorage.getItem('theme-colors')
    return saved ? JSON.parse(saved) : defaultColors
  })

  useEffect(() => {
    // Apply colors to CSS variables
    const root = document.documentElement
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-dark', colors.primaryDark)
    root.style.setProperty('--color-primary-light', colors.primaryLight)
    root.style.setProperty('--color-primary-subtle', colors.primarySubtle)

    // Save to localStorage
    localStorage.setItem('theme-colors', JSON.stringify(colors))
  }, [colors])

  const updateColors = (newColors: Partial<ThemeColors>) => {
    setColors((prev) => ({ ...prev, ...newColors }))
  }

  const resetColors = () => {
    setColors(defaultColors)
    localStorage.removeItem('theme-colors')
  }

  return (
    <ThemeContext.Provider value={{ colors, updateColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

