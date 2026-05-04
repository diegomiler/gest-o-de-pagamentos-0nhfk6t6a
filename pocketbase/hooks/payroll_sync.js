routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    const month = body.month
    const entries = body.entries

    const startDate = month + '-01 00:00:00'
    const endDate = month + '-31 23:59:59'

    $app.runInTransaction((txApp) => {
      // Delete existing records for the month
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

      // Insert new records
      const col = txApp.findCollectionByNameOrId('payroll_entries')
      for (const entry of entries) {
        const emp = txApp.findRecordById('employees', entry.employee_id)
        const companyId = emp.get('company_id')
        const baseSalary = emp.get('base_salary')
        const overtimeParam = emp.get('overtime_parameter') || 1.5

        const createEntry = (category, amount, quantity = 0) => {
          if (amount > 0 || quantity > 0) {
            const record = new Record(col)
            record.set('employee_id', emp.id)
            record.set('company_id', companyId)
            record.set('category', category)
            record.set('amount', amount)
            record.set('quantity', quantity)
            record.set('entry_date', month + '-01 12:00:00.000Z')
            txApp.save(record)
          }
        }

        createEntry('commission', entry.commissions)
        createEntry('bonus', entry.bonuses)
        createEntry('pharmacy_discount', entry.pharmacy)
        createEntry('advance', entry.advances)

        if (entry.overtime_hours > 0) {
          const overtimeValue = (baseSalary / 30 / 7.33) * entry.overtime_hours * overtimeParam
          createEntry('overtime', overtimeValue, entry.overtime_hours)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
