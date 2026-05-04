routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    const month = body.month
    const entries = body.entries || []

    if (!month) return e.badRequestError('Month is required')

    const startDate = `${month}-01 00:00:00`
    const endDate = `${month}-31 23:59:59`

    $app.runInTransaction((txApp) => {
      // Delete existing entries for this month
      const existing = txApp.findRecordsByFilter(
        'payroll_entries',
        `entry_date >= '${startDate}' && entry_date <= '${endDate}'`,
        '',
        10000,
        0,
      )
      for (const record of existing) {
        txApp.delete(record)
      }

      const col = txApp.findCollectionByNameOrId('payroll_entries')

      for (const entry of entries) {
        const emp = txApp.findRecordById('employees', entry.employee_id)
        const companyId = emp.get('company_id')

        const createEntry = (category, amount, quantity = 0) => {
          const record = new Record(col)
          record.set('employee_id', entry.employee_id)
          record.set('company_id', companyId)
          record.set('category', category)
          record.set('amount', amount)
          if (quantity > 0) record.set('quantity', quantity)
          record.set('entry_date', `${month}-01 12:00:00`)
          txApp.save(record)
        }

        if (entry.commissions > 0) createEntry('commission', entry.commissions)
        if (entry.bonuses > 0) createEntry('bonus', entry.bonuses)
        if (entry.pharmacy > 0) createEntry('pharmacy_discount', entry.pharmacy)
        if (entry.advances > 0) createEntry('advance', entry.advances)
        if (entry.overtime_hours > 0) createEntry('overtime', 0, entry.overtime_hours)
        if (entry.base_net !== null && entry.base_net !== undefined && entry.base_net !== '') {
          createEntry('base_net', Number(entry.base_net))
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
