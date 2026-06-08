onRecordValidate((e) => {
  const record = e.record
  const entryDate = record.getString('entry_date')
  if (!entryDate) return e.next()

  const date = new Date(entryDate)
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()
  const company_id = record.getString('company_id')

  try {
    const period = $app.findFirstRecordByFilter(
      'payroll_periods',
      'company_id = {:company_id} && month = {:month} && year = {:year}',
      {
        company_id,
        month,
        year,
      },
    )
    if (period.getString('status') === 'closed') {
      throw new BadRequestError('Período de folha fechado. Não é possível alterar lançamentos.')
    }
  } catch (err) {
    if (err.status === 400) throw err
  }

  return e.next()
}, 'payroll_entries')

onRecordDelete((e) => {
  const record = e.record
  const entryDate = record.getString('entry_date')
  if (!entryDate) return e.next()

  const date = new Date(entryDate)
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()
  const company_id = record.getString('company_id')

  try {
    const period = $app.findFirstRecordByFilter(
      'payroll_periods',
      'company_id = {:company_id} && month = {:month} && year = {:year}',
      {
        company_id,
        month,
        year,
      },
    )
    if (period.getString('status') === 'closed') {
      throw new BadRequestError('Período de folha fechado. Não é possível excluir lançamentos.')
    }
  } catch (err) {
    if (err.status === 400) throw err
  }

  return e.next()
}, 'payroll_entries')
