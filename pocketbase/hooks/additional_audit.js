routerAdd(
  'POST',
  '/backend/v1/payroll/additional',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const employeeId = body.employee_id
    const companyId = body.company_id
    const amount = parseFloat(body.amount)
    const entryDate = body.entry_date
    const reason = (body.reason || '').trim()
    const entryId = body.entry_id || ''
    const oldValue =
      body.old_value !== undefined && body.old_value !== null ? String(body.old_value) : ''

    if (!employeeId || !companyId || !entryDate) {
      return e.badRequestError('missing required fields')
    }
    if (isNaN(amount)) {
      return e.badRequestError('invalid amount')
    }
    if (reason.length < 5) {
      return e.badRequestError('reason is required (min 5 characters)')
    }

    const date = new Date(entryDate)
    const month = date.getUTCMonth() + 1
    const year = date.getUTCFullYear()

    try {
      const period = $app.findFirstRecordByFilter(
        'payroll_periods',
        'company_id = {:cid} && month = {:m} && year = {:y}',
        { cid: companyId, m: month, y: year },
      )
      if (period.getString('status') === 'closed') {
        return e.badRequestError('Período de folha fechado. Não é possível alterar lançamentos.')
      }
    } catch (_) {}

    try {
      const peCol = $app.findCollectionByNameOrId('payroll_entries')
      let savedEntryId = ''

      if (entryId) {
        const rec = $app.findRecordById('payroll_entries', entryId)
        rec.set('amount', amount)
        rec.set('updated_by', userId)
        $app.save(rec)
        savedEntryId = rec.id
      } else {
        const rec = new Record(peCol)
        rec.set('employee_id', employeeId)
        rec.set('company_id', companyId)
        rec.set('category', 'additional')
        rec.set('amount', amount)
        rec.set('entry_date', entryDate)
        rec.set('created_by', userId)
        rec.set('updated_by', userId)
        $app.save(rec)
        savedEntryId = rec.id
      }

      const histCol = $app.findCollectionByNameOrId('employee_history')
      const histRec = new Record(histCol)
      histRec.set('employee_id', employeeId)
      histRec.set('change_type', 'additional_amount')
      histRec.set('old_value', oldValue)
      histRec.set('new_value', String(amount))
      histRec.set('reason', reason)
      $app.save(histRec)

      return e.json(200, { success: true, entry_id: savedEntryId })
    } catch (err) {
      const msg = err?.message || 'failed to save additional'
      if (err && err.status === 400) {
        return e.json(400, { error: msg })
      }
      return e.json(500, { error: 'internal server error' })
    }
  },
  $apis.requireAuth(),
)
