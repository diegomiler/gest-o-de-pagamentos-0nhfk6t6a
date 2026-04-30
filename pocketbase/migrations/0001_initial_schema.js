migrate(
  (app) => {
    const companies = new Collection({
      name: 'companies',
      type: 'base',
      listRule: '@request.auth.company_id = id',
      viewRule: '@request.auth.company_id = id',
      createRule: null,
      updateRule: '@request.auth.company_id = id',
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'tax_id', type: 'text' },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_companies_tax_id ON companies (tax_id) WHERE tax_id != ''",
      ],
    })
    app.save(companies)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('company_id')) {
      users.fields.add(
        new RelationField({
          name: 'company_id',
          collectionId: companies.id,
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
      app.save(users)
    }

    const employees = new Collection({
      name: 'employees',
      type: 'base',
      listRule: '@request.auth.company_id = company_id',
      viewRule: '@request.auth.company_id = company_id',
      createRule: '@request.auth.company_id = company_id',
      updateRule: '@request.auth.company_id = company_id',
      deleteRule: '@request.auth.company_id = company_id',
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          collectionId: companies.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text' },
        { name: 'department', type: 'text' },
        { name: 'base_salary', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'inactive', 'on_leave'],
          required: true,
        },
        { name: 'admission_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(employees)

    const payroll_entries = new Collection({
      name: 'payroll_entries',
      type: 'base',
      listRule: '@request.auth.company_id = company_id',
      viewRule: '@request.auth.company_id = company_id',
      createRule: '@request.auth.company_id = company_id',
      updateRule: '@request.auth.company_id = company_id',
      deleteRule: '@request.auth.company_id = company_id',
      fields: [
        {
          name: 'employee_id',
          type: 'relation',
          collectionId: employees.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'company_id',
          type: 'relation',
          collectionId: companies.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'select',
          values: ['commission', 'bonus', 'pharmacy_discount', 'advance', 'additional', 'other'],
          required: true,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'entry_date', type: 'date', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(payroll_entries)
  },
  (app) => {
    const payroll_entries = app.findCollectionByNameOrId('payroll_entries')
    app.delete(payroll_entries)

    const employees = app.findCollectionByNameOrId('employees')
    app.delete(employees)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('company_id')
    app.save(users)

    const companies = app.findCollectionByNameOrId('companies')
    app.delete(companies)
  },
)
