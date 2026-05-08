routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    if (!body || !body.month || !body.entries) {
      return e.badRequestError('Dados inválidos.')
    }

    const month = body.month // "YYYY-MM"
    const entries = body.entries

    const startDate = month + '-01 00:00:00.000Z'
    const startObj = new Date(month + '-01T00:00:00Z')
    const nextMonthObj = new Date(startObj)
    nextMonthObj.setUTCMonth(nextMonthObj.getUTCMonth() + 1)
    const endDate = nextMonthObj.toISOString().substring(0, 10) + ' 00:00:00.000Z'

    $app.runInTransaction((txApp) => {
      for (const empData of entries) {
        const empId = empData.employee_id
        let emp
        try {
          emp = txApp.findRecordById('employees', empId)
        } catch (err) {
          continue
        }

        const companyId = emp.get('company_id')

        const existing = txApp.findRecordsByFilter(
          'payroll_entries',
          'employee_id = {:empId} && entry_date >= {:start} && entry_date < {:end}',
          '-created',
          1000,
          0,
          { empId: empId, start: startDate, end: endDate },
        )

        for (const rec of existing) {
          txApp.delete(rec)
        }

        const categories = [
          { key: 'commissions', cat: 'commission', descKey: '' },
          { key: 'bonuses', cat: 'bonus', descKey: '' },
          { key: 'pharmacy', cat: 'pharmacy_discount', descKey: '' },
          { key: 'advances', cat: 'advance', descKey: '' },
          { key: 'base_net', cat: 'base_net', descKey: '' },
          { key: 'cash_shortage', cat: 'cash_shortage', descKey: 'cash_shortage_desc' },
          { key: 'negative_hours', cat: 'negative_hours', descKey: 'negative_hours_desc' },
          { key: 'partner_agreement', cat: 'partner_agreement', descKey: 'partner_agreement_desc' },
          { key: 'store_agreement', cat: 'store_agreement', descKey: 'store_agreement_desc' },
          { key: 'other_discount', cat: 'other_discount', descKey: 'other_discount_desc' },
          { key: 'other_addition', cat: 'other_addition', descKey: 'other_addition_desc' },
        ]

        const payrollCol = txApp.findCollectionByNameOrId('payroll_entries')
        const entryDate = month + '-01 12:00:00.000Z'

        for (const map of categories) {
          const rawValue = empData[map.key]
          const amount = Number(rawValue) || 0

          if (amount !== 0 || map.cat === 'base_net') {
            const rec = new Record(payrollCol)
            rec.set('employee_id', empId)
            rec.set('company_id', companyId)
            rec.set('category', map.cat)
            rec.set('amount', amount)
            rec.set('entry_date', entryDate)
            if (map.descKey && empData[map.descKey]) {
              rec.set('description', String(empData[map.descKey]))
            }
            txApp.save(rec)
          }
        }

        const otHours = Number(empData.overtime_hours) || 0
        if (otHours !== 0) {
          const rec = new Record(payrollCol)
          rec.set('employee_id', empId)
          rec.set('company_id', companyId)
          rec.set('category', 'overtime')
          rec.set('amount', 0)
          rec.set('quantity', otHours)
          rec.set('entry_date', entryDate)
          txApp.save(rec)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
