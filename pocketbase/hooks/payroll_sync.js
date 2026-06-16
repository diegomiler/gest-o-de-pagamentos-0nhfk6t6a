routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    if (!body.month || !body.entries || !Array.isArray(body.entries)) {
      throw new BadRequestError('Mês e lançamentos são obrigatórios')
    }

    const monthStr = body.month
    const startDate = monthStr + '-01 00:00:00'
    const parts = monthStr.split('-')
    const lastDay = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate()
    const endDate = monthStr + '-' + lastDay + ' 23:59:59'
    const userId = e.auth?.id

    const catsMap = {
      base_net: 'base_net',
      commissions: 'commission',
      bonuses: 'bonus',
      market_voucher: 'market_voucher',
      pharmacy: 'pharmacy_discount',
      advances: 'advance',
      cash_shortage: 'cash_shortage',
      negative_hours: 'negative_hours',
      partner_agreement: 'partner_agreement',
      store_agreement: 'store_agreement',
      other_discount: 'other_discount',
      other_addition: 'other_addition',
    }

    $app.runInTransaction((txApp) => {
      for (const entry of body.entries) {
        const empId = entry.employee_id
        const compId = entry.company_id
        if (!empId || !compId) continue

        const existing = txApp.findRecordsByFilter(
          'payroll_entries',
          `employee_id = {:emp} && entry_date >= {:start} && entry_date <= {:end}`,
          '',
          1000,
          0,
          { emp: empId, start: startDate, end: endDate },
        )

        for (const rec of existing) {
          txApp.delete(rec)
        }

        for (const [key, dbCat] of Object.entries(catsMap)) {
          const amount = Number(entry[key]) || 0
          if (amount > 0) {
            const r = new Record(txApp.findCollectionByNameOrId('payroll_entries'))
            r.set('employee_id', empId)
            r.set('company_id', compId)
            r.set('category', dbCat)
            r.set('amount', amount)
            r.set('entry_date', startDate)

            const descKey = key + '_desc'
            if (entry[descKey]) {
              r.set('description', entry[descKey])
            }
            if (userId) {
              r.set('created_by', userId)
              r.set('updated_by', userId)
            }

            txApp.save(r)
          }
        }

        const otHours = Number(entry.overtime_hours) || 0
        const otAmount = Number(entry.overtime_amount) || 0
        if (otHours > 0) {
          const r = new Record(txApp.findCollectionByNameOrId('payroll_entries'))
          r.set('employee_id', empId)
          r.set('company_id', compId)
          r.set('category', 'overtime')
          r.set('quantity', otHours)
          r.set('amount', otAmount)
          r.set('entry_date', startDate)
          if (userId) {
            r.set('created_by', userId)
            r.set('updated_by', userId)
          }
          txApp.save(r)
        }

        try {
          const empRec = txApp.findRecordById('employees', empId)
          const fixedAdditional = empRec.getFloat('additional_amount') || 0
          if (fixedAdditional > 0) {
            const r = new Record(txApp.findCollectionByNameOrId('payroll_entries'))
            r.set('employee_id', empId)
            r.set('company_id', compId)
            r.set('category', 'additional')
            r.set('amount', fixedAdditional)
            r.set('entry_date', startDate)
            if (userId) {
              r.set('created_by', userId)
              r.set('updated_by', userId)
            }
            txApp.save(r)
          }
        } catch (_) {}
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
