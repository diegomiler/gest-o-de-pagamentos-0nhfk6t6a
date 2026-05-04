routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    if (!body.month || !body.entries) {
      return e.badRequestError('Missing month or entries')
    }

    const month = body.month
    const startDate = `${month}-01 00:00:00.000Z`
    const endDate = `${month}-31 23:59:59.000Z`

    $app.runInTransaction((txApp) => {
      for (const entry of body.entries) {
        const empId = entry.employee_id
        const emp = txApp.findRecordById('employees', empId)
        const companyId = emp.get('company_id')

        const comp = txApp.findRecordById('companies', companyId)
        let config = comp.get('overtime_config') || []
        if (typeof config === 'string') {
          try {
            config = JSON.parse(config)
          } catch (_) {
            config = []
          }
        }

        let overtimeHours = Number(entry.overtime_hours) || 0
        let overtimeValue = 0
        const baseSalary = Number(emp.get('base_salary')) || 0
        const hourlyRate = baseSalary / 30 / 7.33

        if (config.length === 0 || overtimeHours === 0) {
          overtimeValue = hourlyRate * 1.5 * overtimeHours
        } else {
          let sorted = [...config].sort((a, b) => {
            if (a.limit === null) return 1
            if (b.limit === null) return -1
            return a.limit - b.limit
          })

          let previousLimit = 0
          for (const b of sorted) {
            if (overtimeHours <= previousLimit) break
            const mult = 1 + Number(b.percentage) / 100
            let h = overtimeHours - previousLimit
            if (b.limit !== null) {
              h = Math.min(h, b.limit - previousLimit)
            }
            if (h > 0) {
              overtimeValue += hourlyRate * mult * h
            }
            if (b.limit !== null) {
              previousLimit = b.limit
            } else {
              break
            }
          }
        }

        const existing = txApp.findRecordsByFilter(
          'payroll_entries',
          `employee_id = {:emp} && entry_date >= {:start} && entry_date <= {:end}`,
          '',
          1000,
          0,
          { emp: empId, start: startDate, end: endDate },
        )
        for (const ex of existing) {
          txApp.delete(ex)
        }

        const toInsert = [
          { cat: 'commission', amt: entry.commissions },
          { cat: 'bonus', amt: entry.bonuses },
          { cat: 'pharmacy_discount', amt: entry.pharmacy },
          { cat: 'advance', amt: entry.advances },
          { cat: 'overtime', amt: overtimeValue, qty: entry.overtime_hours },
        ]

        for (const item of toInsert) {
          if (Number(item.amt) > 0 || Number(item.qty) > 0) {
            const col = txApp.findCollectionByNameOrId('payroll_entries')
            const rec = new Record(col)
            rec.set('employee_id', empId)
            rec.set('company_id', companyId)
            rec.set('category', item.cat)
            rec.set('amount', Number(item.amt) || 0)
            rec.set('quantity', Number(item.qty) || 0)
            rec.set('entry_date', `${month}-05 12:00:00.000Z`)
            txApp.save(rec)
          }
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
