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

export const parseInputValue = (value: string) => {
  const parsed = parseFloat(value)
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
  if (parseInt(mins) >= 60) mins = '59'
  return `${hrs.padStart(2, '0')}:${mins}`
}
