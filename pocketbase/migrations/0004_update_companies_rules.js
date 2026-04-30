migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId('companies')
    companies.listRule = "@request.auth.id != ''"
    companies.viewRule = "@request.auth.id != ''"
    companies.createRule = "@request.auth.id != ''"
    companies.updateRule = "@request.auth.id != ''"
    companies.deleteRule = "@request.auth.id != ''"
    app.save(companies)

    const employees = app.findCollectionByNameOrId('employees')
    employees.listRule = "@request.auth.id != ''"
    employees.viewRule = "@request.auth.id != ''"
    employees.createRule = "@request.auth.id != ''"
    employees.updateRule = "@request.auth.id != ''"
    employees.deleteRule = "@request.auth.id != ''"
    app.save(employees)

    const payroll_entries = app.findCollectionByNameOrId('payroll_entries')
    payroll_entries.listRule = "@request.auth.id != ''"
    payroll_entries.viewRule = "@request.auth.id != ''"
    payroll_entries.createRule = "@request.auth.id != ''"
    payroll_entries.updateRule = "@request.auth.id != ''"
    payroll_entries.deleteRule = "@request.auth.id != ''"
    app.save(payroll_entries)
  },
  (app) => {
    const companies = app.findCollectionByNameOrId('companies')
    companies.listRule = '@request.auth.company_id = id'
    companies.viewRule = '@request.auth.company_id = id'
    companies.createRule = null
    companies.updateRule = '@request.auth.company_id = id'
    companies.deleteRule = null
    app.save(companies)

    const employees = app.findCollectionByNameOrId('employees')
    employees.listRule = '@request.auth.company_id = company_id'
    employees.viewRule = '@request.auth.company_id = company_id'
    employees.createRule = '@request.auth.company_id = company_id'
    employees.updateRule = '@request.auth.company_id = company_id'
    employees.deleteRule = '@request.auth.company_id = company_id'
    app.save(employees)

    const payroll_entries = app.findCollectionByNameOrId('payroll_entries')
    payroll_entries.listRule = '@request.auth.company_id = company_id'
    payroll_entries.viewRule = '@request.auth.company_id = company_id'
    payroll_entries.createRule = '@request.auth.company_id = company_id'
    payroll_entries.updateRule = '@request.auth.company_id = company_id'
    payroll_entries.deleteRule = '@request.auth.company_id = company_id'
    app.save(payroll_entries)
  },
)
