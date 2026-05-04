migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('overtime_config')) {
      col.fields.add(new JSONField({ name: 'overtime_config' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('overtime_config')
    app.save(col)
  },
)
