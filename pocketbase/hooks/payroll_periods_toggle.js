routerAdd(
  'POST',
  '/backend/v1/payroll-periods/toggle',
  (e) => {
    const body = e.requestInfo().body
    const company_id = body.company_id
    const month = Number(body.month)
    const year = Number(body.year)
    const status = body.status

    if (!company_id || !month || !year || !status) {
      return e.badRequestError('Missing required fields')
    }

    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Auth required')

    const user = $app.findRecordById('users', userId)
    if (user.getString('role') !== 'admin') {
      if (user.getString('company_id') !== company_id) {
        return e.forbiddenError('Not allowed to toggle this company')
      }
    }

    try {
      const period = $app.findFirstRecordByFilter(
        'payroll_periods',
        'company_id = {:company_id} && month = {:month} && year = {:year}',
        {
          company_id,
          month,
          year,
        },
      )
      period.set('status', status)
      $app.save(period)
      return e.json(200, period)
    } catch (_) {
      const col = $app.findCollectionByNameOrId('payroll_periods')
      const period = new Record(col)
      period.set('company_id', company_id)
      period.set('month', month)
      period.set('year', year)
      period.set('status', status)
      $app.save(period)
      return e.json(200, period)
    }
  },
  $apis.requireAuth(),
)
