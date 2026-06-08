migrate(
  (app) => {
    const payroll = app.findCollectionByNameOrId('payroll_entries')
    payroll.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    payroll.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    payroll.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    payroll.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    payroll.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || (company_id = @request.auth.company_id && @request.auth.role != 'editor'))"
    app.save(payroll)

    const time = app.findCollectionByNameOrId('time_records')
    time.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    time.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    time.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    time.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    time.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || (company_id = @request.auth.company_id && @request.auth.role != 'editor'))"
    app.save(time)

    const overtime = app.findCollectionByNameOrId('overtime_rules')
    overtime.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    overtime.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    overtime.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    overtime.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    overtime.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(overtime)
  },
  (app) => {
    const payroll = app.findCollectionByNameOrId('payroll_entries')
    payroll.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    payroll.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    payroll.createRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    payroll.updateRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    payroll.deleteRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role != 'editor'"
    app.save(payroll)

    const time = app.findCollectionByNameOrId('time_records')
    time.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    time.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    time.createRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    time.updateRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    time.deleteRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role != 'editor'"
    app.save(time)

    const overtime = app.findCollectionByNameOrId('overtime_rules')
    overtime.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    overtime.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    overtime.createRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
    overtime.updateRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
    overtime.deleteRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
    app.save(overtime)
  },
)
