migrate(
  (app) => {
    const dataCollections = ['employees', 'payroll_entries', 'employee_history', 'time_records']
    for (const name of dataCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.createRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.updateRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.deleteRule =
          "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role != 'editor'"
        app.save(col)
      } catch (_) {}
    }

    const settingsCollections = ['overtime_rules']
    for (const name of settingsCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
        col.createRule =
          "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
        col.updateRule =
          "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
        col.deleteRule =
          "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin'"
        app.save(col)
      } catch (_) {}
    }

    try {
      const companies = app.findCollectionByNameOrId('companies')
      companies.listRule = "@request.auth.id != '' && id = @request.auth.company_id"
      companies.viewRule = "@request.auth.id != '' && id = @request.auth.company_id"
      companies.createRule = null
      companies.updateRule =
        "@request.auth.id != '' && id = @request.auth.company_id && @request.auth.role = 'admin'"
      companies.deleteRule = null
      app.save(companies)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('users')
      users.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
      users.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
      users.createRule =
        "@request.auth.role = 'admin' && @request.auth.company_id != '' && company_id = @request.auth.company_id"
      users.updateRule =
        "((@request.auth.id = id && (@request.body.role = '' || @request.body.role = role)) || (@request.auth.company_id = company_id && @request.auth.role = 'admin')) && (@request.body.company_id = '' || @request.body.company_id = company_id)"
      users.deleteRule =
        "@request.auth.id = id || (@request.auth.company_id = company_id && @request.auth.role = 'admin')"
      app.save(users)
    } catch (_) {}
  },
  (app) => {
    // Irreversible or manual revert
  },
)
