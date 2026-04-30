routerAdd(
  'POST',
  '/backend/v1/payroll/sync',
  (e) => {
    const body = e.requestInfo().body
    const month = body.month
    const entries = body.entries
    const companyId = e.auth?.getString('company_id')

    if (!companyId) return e.unauthorizedError('Not linked to a company')
    if (!month || !entries) return e.badRequestError('Missing month or entries')

    $app.runInTransaction((txApp) => {
      const startDate = month + '-01 00:00:00.000Z'
      const endDate = month + '-31 23:59:59.000Z'

      const existing = txApp.findRecordsByFilter(
        'payroll_entries',
        `company_id = {:companyId} && entry_date >= {:startDate} && entry_date <= {:endDate}`,
        '',
        10000,
        0,
        { companyId: companyId, startDate: startDate, endDate: endDate },
      )

      for (const rec of existing) {
        txApp.delete(rec)
      }

      const col = txApp.findCollectionByNameOrId('payroll_entries')

      for (const emp of entries) {
        const map = {
          commission: emp.commissions,
          bonus: emp.bonuses,
          pharmacy_discount: emp.pharmacy,
          advance: emp.advances,
        }

        for (const [cat, amt] of Object.entries(map)) {
          if (amt && Number(amt) > 0) {
            const rec = new Record(col)
            rec.set('company_id', companyId)
            rec.set('employee_id', emp.employee_id)
            rec.set('category', cat)
            rec.set('amount', Number(amt))
            rec.set('entry_date', startDate)
            txApp.save(rec)
          }
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
