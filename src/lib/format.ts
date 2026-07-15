export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatMonthYear = (dateStr: string) => {
  const [year, month] = dateStr.split('-')
  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  return `${months[parseInt(month) - 1]} / ${year}`
}

export const parseInputValue = (value: string | number) => {
  if (value === null || value === undefined) return 0
  const str = String(value).trim().replace(',', '.')
  if (str === '') return 0
  const parsed = parseFloat(str)
  return isNaN(parsed) ? 0 : parsed
}

export const decimalToTime = (decimal: number) => {
  if (!decimal) return '00:00'
  let hours = Math.floor(decimal)
  let minutes = Math.round((decimal - hours) * 60)
  if (minutes === 60) {
    hours += 1
    minutes = 0
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export const timeToDecimal = (timeStr: string) => {
  if (!timeStr) return 0
  const [hours, minutes] = timeStr.split(':').map(Number)
  if (isNaN(hours)) return 0
  return hours + (isNaN(minutes) ? 0 : minutes / 60)
}

export const formatCPF = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
}

export const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 8)
  if (v.length <= 5) return v
  return `${v.slice(0, 5)}-${v.slice(5)}`
}

export const formatCNPJ = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 14)
  if (v.length <= 2) return v
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`
  if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`
}

export const formatTimeOnBlur = (value: string) => {
  if (!value) return '00:00'
  let val = value.replace(/[^\d:]/g, '')
  if (!val.includes(':')) {
    val = val + ':00'
  }
  const parts = val.split(':')
  let hrs = parts[0] || '0'
  let mins = parts[1] || '00'
  mins = mins.padEnd(2, '0').slice(0, 2)
  return `${hrs.padStart(2, '0')}:${mins}`
}
