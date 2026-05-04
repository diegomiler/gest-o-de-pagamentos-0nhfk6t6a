migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    col.fields.removeByName('overtime_parameter')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    if (!col.fields.getByName('overtime_parameter')) {
      col.fields.add(new NumberField({ name: 'overtime_parameter' }))
    }
    app.save(col)
  },
)
