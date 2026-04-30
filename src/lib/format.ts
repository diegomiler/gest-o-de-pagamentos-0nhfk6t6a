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
