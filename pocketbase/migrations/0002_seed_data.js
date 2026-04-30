migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId('companies')
    let company
    try {
      company = app.findFirstRecordByData('companies', 'tax_id', '12.345.678/0001-90')
    } catch (_) {
      company = new Record(companies)
      company.set('name', 'Empresa Exemplo')
      company.set('tax_id', '12.345.678/0001-90')
      app.save(company)
    }

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'diegomiler@live.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('diegomiler@live.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin')
      user.set('company_id', company.id)
      app.save(user)
    }

    const employees = app.findCollectionByNameOrId('employees')
    const payroll_entries = app.findCollectionByNameOrId('payroll_entries')

    const emps = [
      {
        name: 'Ana Silva',
        role: 'Vendedora',
        department: 'Vendas',
        base_salary: 2500,
        status: 'active',
        admission_date: '2024-01-15 12:00:00.000Z',
      },
      {
        name: 'Carlos Souza',
        role: 'Gerente',
        department: 'Vendas',
        base_salary: 5000,
        status: 'active',
        admission_date: '2023-06-10 12:00:00.000Z',
      },
      {
        name: 'Mariana Santos',
        role: 'Desenvolvedora',
        department: 'TI',
        base_salary: 6500,
        status: 'on_leave',
        admission_date: '2025-02-01 12:00:00.000Z',
      },
    ]

    for (const empData of emps) {
      try {
        app.findFirstRecordByData('employees', 'name', empData.name)
      } catch (_) {
        const emp = new Record(employees)
        emp.set('company_id', company.id)
        emp.set('name', empData.name)
        emp.set('role', empData.role)
        emp.set('department', empData.department)
        emp.set('base_salary', empData.base_salary)
        emp.set('status', empData.status)
        emp.set('admission_date', empData.admission_date)
        app.save(emp)

        const p1 = new Record(payroll_entries)
        p1.set('employee_id', emp.id)
        p1.set('company_id', company.id)
        p1.set('category', 'commission')
        p1.set('amount', 500)
        p1.set('entry_date', '2026-04-01 12:00:00.000Z')
        app.save(p1)

        const p2 = new Record(payroll_entries)
        p2.set('employee_id', emp.id)
        p2.set('company_id', company.id)
        p2.set('category', 'pharmacy_discount')
        p2.set('amount', 100)
        p2.set('entry_date', '2026-04-01 12:00:00.000Z')
        app.save(p2)
      }
    }
  },
  (app) => {
    // Downgrade not strictly required for seed
  },
)
