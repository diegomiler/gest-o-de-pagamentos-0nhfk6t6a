import { createContext, useContext, useState, ReactNode } from 'react'

interface PeriodContextType {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
}

const getCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined)

export const PeriodProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())

  return (
    <PeriodContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </PeriodContext.Provider>
  )
}

export const usePeriod = () => {
  const context = useContext(PeriodContext)
  if (!context) throw new Error('usePeriod must be used within a PeriodProvider')
  return context
}
