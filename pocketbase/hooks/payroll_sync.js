// sync payroll entries for multiple employees in a single transaction
routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    const month = body.month // "YYYY-MM"
    const entries = body.entries // array of objects

    if (!month || !Array.isArray(entries)) {
      return e.badRequestError('Invalid payload')
    }

    const startDate = month + '-01 00:00:00'
    const endDate = month + '-31 23:59:59'

    $app.runInTransaction((txApp) => {
      for (const emp of entries) {
        const employeeId = emp.employee_id
        if (!employeeId) continue

        let employee
        try {
          employee = txApp.findRecordById('employees', employeeId)
        } catch (_) {
          continue
        }
        const companyId = employee.get('company_id')

        // Build categories map based on the new schema and payload
        const categories = [
          { key: 'base_net', val: emp.base_net },
          { key: 'commission', val: emp.commissions },
          { key: 'bonus', val: emp.bonuses },
          { key: 'pharmacy_discount', val: emp.pharmacy },
          { key: 'advance', val: emp.advances },
          { key: 'overtime', val: 0, qty: emp.overtime_hours },
          { key: 'cash_shortage', val: emp.cash_shortage, desc: emp.cash_shortage_desc },
          { key: 'negative_hours', val: emp.negative_hours, desc: emp.negative_hours_desc },
          {
            key: 'partner_agreement',
            val: emp.partner_agreement,
            desc: emp.partner_agreement_desc,
          },
          { key: 'store_agreement', val: emp.store_agreement, desc: emp.store_agreement_desc },
          { key: 'other_discount', val: emp.other_discount, desc: emp.other_discount_desc },
          { key: 'other_addition', val: emp.other_addition, desc: emp.other_addition_desc },
        ]

        for (const cat of categories) {
          const val = Number(cat.val) || 0
          const qty = Number(cat.qty) || 0
          const desc = cat.desc || ''

          let record
          try {
            const records = txApp.findRecordsByFilter(
              'payroll_entries',
              `employee_id = {:emp} && category = {:cat} && entry_date >= {:start} && entry_date <= {:end}`,
              '',
              1,
              0,
              { emp: employeeId, cat: cat.key, start: startDate, end: endDate },
            )
            if (records.length > 0) {
              record = records[0]
            }
          } catch (_) {}

          // If no value, quantity or description, delete or skip
          if (val === 0 && qty === 0 && desc === '') {
            if (record) {
              txApp.delete(record)
            }
            continue
          }

          if (!record) {
            const collection = txApp.findCollectionByNameOrId('payroll_entries')
            record = new Record(collection)
            record.set('employee_id', employeeId)
            record.set('company_id', companyId)
            record.set('category', cat.key)
            record.set('entry_date', month + '-01 12:00:00')
          }

          record.set('amount', val)
          record.set('quantity', qty)
          record.set('description', desc)
          txApp.save(record)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
