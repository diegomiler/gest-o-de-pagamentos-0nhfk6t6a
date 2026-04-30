migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    if (!col.fields.getByName('additional_amount')) {
      col.fields.add(new NumberField({ name: 'additional_amount' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    col.fields.removeByName('additional_amount')
    app.save(col)
  },
)
