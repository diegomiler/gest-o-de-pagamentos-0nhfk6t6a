routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    const month = body.month
    const entries = body.entries

    if (!month || !entries) {
      return e.badRequestError('Missing month or entries')
    }

    const startDate = `${month}-01 00:00:00.000Z`
    const endDate = `${month}-31 23:59:59.999Z`

    $app.runInTransaction((txApp) => {
      for (const entry of entries) {
        const empId = entry.employee_id

        const employee = txApp.findRecordById('employees', empId)
        const companyId = employee.get('company_id')

        const existing = txApp.findRecordsByFilter(
          'payroll_entries',
          `employee_id = {:empId} && entry_date >= {:startDate} && entry_date <= {:endDate}`,
          '',
          0,
          0,
          { empId: empId, startDate: startDate, endDate: endDate },
        )

        for (const ex of existing) {
          txApp.delete(ex)
        }

        const categories = [
          { cat: 'commission', amount: entry.commissions },
          { cat: 'bonus', amount: entry.bonuses },
          { cat: 'pharmacy_discount', amount: entry.pharmacy },
          { cat: 'advance', amount: entry.advances },
        ]

        for (const c of categories) {
          if (c.amount && c.amount > 0) {
            const rec = new Record(txApp.findCollectionByNameOrId('payroll_entries'))
            rec.set('employee_id', empId)
            rec.set('company_id', companyId)
            rec.set('category', c.cat)
            rec.set('amount', c.amount)
            rec.set('entry_date', startDate)
            txApp.save(rec)
          }
        }

        if (entry.overtime_hours && entry.overtime_hours > 0) {
          const base_salary = employee.get('base_salary') || 0
          const overtime_rate = (base_salary / 30 / 7.33) * 1.5
          const overtime_amount = overtime_rate * entry.overtime_hours

          const rec = new Record(txApp.findCollectionByNameOrId('payroll_entries'))
          rec.set('employee_id', empId)
          rec.set('company_id', companyId)
          rec.set('category', 'overtime')
          rec.set('amount', overtime_amount)
          rec.set('quantity', entry.overtime_hours)
          rec.set('entry_date', startDate)
          txApp.save(rec)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
