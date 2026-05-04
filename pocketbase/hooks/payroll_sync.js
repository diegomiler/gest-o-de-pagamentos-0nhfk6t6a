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

    const startDate = `${month}-01 00:00:00`
    const endDate = `${month}-31 23:59:59`

    $app.runInTransaction((txApp) => {
      for (const entry of entries) {
        const empId = entry.employee_id
        const emp = txApp.findRecordById('employees', empId)
        const companyId = emp.get('company_id')

        const categories = [
          { name: 'commission', amount: Number(entry.commissions) || 0, qty: 0 },
          { name: 'bonus', amount: Number(entry.bonuses) || 0, qty: 0 },
          { name: 'pharmacy_discount', amount: Number(entry.pharmacy) || 0, qty: 0 },
          { name: 'advance', amount: Number(entry.advances) || 0, qty: 0 },
          { name: 'overtime', amount: 0, qty: Number(entry.overtime_hours) || 0 },
          { name: 'base_net', amount: Number(entry.base_net) || 0, qty: 0 },
        ]

        for (const cat of categories) {
          let existing = null
          try {
            const records = txApp.findRecordsByFilter(
              'payroll_entries',
              `employee_id = '${empId}' && category = '${cat.name}' && entry_date >= '${startDate}' && entry_date <= '${endDate}'`,
              '-created',
              1,
              0,
            )
            if (records && records.length > 0) {
              existing = records[0]
            }
          } catch (err) {}

          if (cat.amount === 0 && cat.qty === 0) {
            if (existing) {
              txApp.delete(existing)
            }
            continue
          }

          if (existing) {
            existing.set('amount', cat.amount)
            existing.set('quantity', cat.qty)
            txApp.save(existing)
          } else {
            const col = txApp.findCollectionByNameOrId('payroll_entries')
            const newRec = new Record(col)
            newRec.set('employee_id', empId)
            newRec.set('company_id', companyId)
            newRec.set('category', cat.name)
            newRec.set('amount', cat.amount)
            newRec.set('quantity', cat.qty)
            newRec.set('entry_date', `${month}-01 12:00:00`)
            txApp.save(newRec)
          }
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
