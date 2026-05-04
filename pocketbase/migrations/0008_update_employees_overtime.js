migrate(
  (app) => {
    const employees = app.findCollectionByNameOrId('employees')
    employees.fields.add(new NumberField({ name: 'overtime_parameter' }))
    app.save(employees)

    app
      .db()
      .newQuery(
        'UPDATE employees SET overtime_parameter = 1.5 WHERE overtime_parameter IS NULL OR overtime_parameter = 0',
      )
      .execute()
  },
  (app) => {
    const employees = app.findCollectionByNameOrId('employees')
    employees.fields.removeByName('overtime_parameter')
    app.save(employees)
  },
)
