migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('address')) {
      col.fields.add(new TextField({ name: 'address' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('address')
    app.save(col)
  },
)
